'use strict';

// ACTION_STATUS names. The specific cause goes in `reason`, never in the code,
// so one Coralogix query over MAGIC_* yields success-vs-failure counts split by
// reason instead of exploding into a code per failure mode.
export const MAGIC_ERROR_CODES = {
  ORDER_CREATE_FAILED: 'MAGIC_ORDER_CREATE_FAILED',
  CHECKOUT_CANCELLED: 'MAGIC_CHECKOUT_CANCELLED',
  PAYMENT_FAILED: 'MAGIC_PAYMENT_FAILED',
  COMPLETE_FAILED: 'MAGIC_COMPLETE_FAILED',
  INVALID_OPTIONS: 'MAGIC_INVALID_OPTIONS',
};

export class MagicCheckoutError extends Error {
  constructor(code, reason, details) {
    super(`${code}: ${reason}`);
    this.name = 'MagicCheckoutError';
    this.code = code;
    this.reason = reason;
    this.details = details || {};
  }
}
