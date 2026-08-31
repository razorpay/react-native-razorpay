'use strict';

import {
  initUrl,
  completeUrl,
  resolvePollBudgetMs,
  BACKOFF_INITIAL_MS,
  BACKOFF_CAP_MS,
} from './endpoints';
import { MagicCheckoutError, MAGIC_ERROR_CODES } from './errors';

// MCS signals "I have the request, my worker owns placement from here" through
// these. They are NOT failures: retrying past them buys nothing, and surfacing
// them as errors would tell a shopper their order failed when it has not.
const PENDING_CODES = ['DELEGATED_TO_SQS', 'ALREADY_PLACED', 'RETRY_FAILED'];

function errorCodeOf(data) {
  if (!data) return undefined;
  if (data.error && typeof data.error.code === 'string') return data.error.code;
  return typeof data.code === 'string' ? data.code : undefined;
}

function backoffFor(attempt) {
  return Math.min(BACKOFF_INITIAL_MS * Math.pow(2, attempt), BACKOFF_CAP_MS);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createClient(http) {
  async function init(key, body) {
    let res;
    try {
      res = await http.post(initUrl(key), body);
    } catch (e) {
      throw new MagicCheckoutError(MAGIC_ERROR_CODES.ORDER_CREATE_FAILED, 'network', {
        message: e && e.message,
      });
    }
    if (res.status !== 200) {
      throw new MagicCheckoutError(
        MAGIC_ERROR_CODES.ORDER_CREATE_FAILED,
        `http_${res.status}`,
        { status: res.status }
      );
    }
    const data = res.data || {};
    if (!data.order_id) {
      throw new MagicCheckoutError(
        MAGIC_ERROR_CODES.ORDER_CREATE_FAILED,
        'missing_order_id',
        {}
      );
    }
    return {
      order_id: data.order_id,
      experiments: data.experiments,
      poll_budget_ms: resolvePollBudgetMs(data.poll_budget_ms),
    };
  }

  // Confirms MCS RECEIVED the request; it does not wait for the Shopify order.
  // Once MCS has it, the mutex, the 24h placed-marker and the SQS worker own
  // the outcome, so the client waiting longer changes nothing a shopper sees.
  async function complete(key, experiments, handle, now, budgetMs) {
    const url = completeUrl(key, experiments);
    const budget = resolvePollBudgetMs(budgetMs);
    const started = now();
    let attempt = 0;

    for (;;) {
      // The budget has to bound the request itself, not just the gaps between
      // attempts. By this point a payment has been captured, and the transports
      // we run on (RN's fetch, and OkHttp under it) impose no read timeout of
      // their own -- so an unbounded attempt would leave the caller holding a
      // promise that never settles over money that has already moved.
      const remaining = budget - (now() - started);
      if (remaining <= 0) return { status: 'pending', data: {} };

      let res;
      let transportError = null;
      try {
        res = await http.post(url, handle, { timeout: remaining });
      } catch (e) {
        transportError = e;
      }

      if (!transportError) {
        if (res.status === 200) {
          return { status: 'placed', data: res.data || {} };
        }
        if (PENDING_CODES.indexOf(errorCodeOf(res.data)) !== -1) {
          return { status: 'pending', data: res.data || {} };
        }
        if (res.status < 500) {
          throw new MagicCheckoutError(
            MAGIC_ERROR_CODES.COMPLETE_FAILED,
            `http_${res.status}`,
            { status: res.status, handle }
          );
        }
      }

      // 5xx or transport failure: retry is safe because MCS is idempotent
      // (mutex + 24h marker + Shopify search fallback).
      if (now() - started >= budget) {
        return { status: 'pending', data: {} };
      }
      await sleep(backoffFor(attempt));
      attempt += 1;
    }
  }

  return { init, complete };
}
