'use strict';

export const BASE_URL = 'https://api.razorpay.com/v1';

// The SDK's own waiting budget for phase 3 — not a money timeout. Exhausting it
// does NOT mean the order failed: MCS's worker keeps retrying for ~15 minutes
// after it has the request. Kept short deliberately so the native SDK is never
// left waiting on the WebView completion callback.
export const POLL_BUDGET_MS = 8000;
export const BACKOFF_INITIAL_MS = 500;
export const BACKOFF_CAP_MS = 2000;

const PRE_PAYMENT_GUARDRAIL = 'shopify_pre_payment_guardrail';

export function initUrl(key) {
  return `${BASE_URL}/magic/shopify/init?key_id=${encodeURIComponent(key)}`;
}

// Mirrors magic-plugins post-checkout.ts:162-166. The experiment value arrives
// in the phase-1 response, so which endpoint a shipped binary calls stays
// server-tunable — a merchant moved into the variant cohort does not need an
// app update to keep placing orders.
export function completeUrl(key, experiments) {
  const path =
    experiments && experiments[PRE_PAYMENT_GUARDRAIL] === 'variant_on'
      ? 'checkouts/shopify/complete'
      : '1cc/shopify/complete';
  return `${BASE_URL}/${path}?key_id=${encodeURIComponent(key)}`;
}
