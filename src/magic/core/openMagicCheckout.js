'use strict';

import { MagicCheckoutError, MAGIC_ERROR_CODES } from './errors';

const NATIVE_PAYMENT_CANCELED = 0;

// A cart object must never reach us. Prices and line items belong server-side;
// accepting one here would put amounts in a publicly-readable package and on
// the wire from a device we do not control. Checked before any network call.
function validate(options) {
  const o = options || {};
  if (!o.key) return 'missing_key';
  if (!o.cart_id) return 'missing_cart_id';
  if (!o.storefront_access_token) return 'missing_storefront_access_token';
  if (o.shopify_cart || o.cart || o.line_items) return 'cart_not_allowed';
  return null;
}

// client.js only ever rejects with a MagicCheckoutError, but this promise is
// public API surface -- a future client swap, or any other rejection shape
// (a string, a plain object), must not throw trying to attach `.details`.
// Normalising here means the handle always has somewhere safe to land.
function asMagicCheckoutError(err, reason) {
  if (err instanceof MagicCheckoutError) return err;
  return new MagicCheckoutError(MAGIC_ERROR_CODES.COMPLETE_FAILED, reason, {
    original: err instanceof Error ? err.message : err,
  });
}

export function makeOpenMagicCheckout({ host, client }) {
  return function openMagicCheckout(options) {
    const invalidReason = validate(options);
    if (invalidReason) {
      return Promise.reject(
        new MagicCheckoutError(MAGIC_ERROR_CODES.INVALID_OPTIONS, invalidReason, {})
      );
    }

    const { key, cart_id, storefront_access_token } = options;

    return client
      .init(key, { cart_id, storefront_access_token })
      .then(({ order_id, experiments }) => {
        return new Promise((resolve, reject) => {
          let unsubscribe = null;
          const release = () => {
            if (unsubscribe) unsubscribe();
            unsubscribe = null;
          };

          // The native bridge is not contractually limited to one event per
          // checkout, and phase 3 can be in flight for the whole ~8s poll
          // budget while the subscription is technically still live. A late
          // second event -- success after a dismissal, or a stray error
          // after success -- must not be allowed to rewrite an outcome that
          // already happened: a placed, paid order reported as cancelled, or
          // `complete` called after the user closed the modal. `settled` is
          // flipped the instant the first event is accepted, paired with
          // `release()` so both effects land atomically; every path after
          // that point is a guaranteed no-op for any later event.
          let settled = false;
          const acceptEvent = () => {
            if (settled) return false;
            settled = true;
            release();
            return true;
          };

          unsubscribe = host.subscribe({
            onSuccess: (data) => {
              if (!acceptEvent()) return;

              // The bridge does not guarantee a well-formed payload. We
              // already have order_id (phase 1) and key (caller options), so
              // even a garbage/empty payload still gets a handle a merchant
              // can use to look up the payment by order id -- a promise that
              // hangs forever after money has moved is the one outcome we
              // must never produce.
              const safe = data || {};
              const handle = {
                razorpay_order_id: safe.razorpay_order_id || order_id,
                razorpay_payment_id: safe.razorpay_payment_id,
                razorpay_signature: safe.razorpay_signature,
                key,
              };

              if (!handle.razorpay_payment_id) {
                reject(
                  new MagicCheckoutError(
                    MAGIC_ERROR_CODES.COMPLETE_FAILED,
                    'invalid_success_payload',
                    { handle }
                  )
                );
                return;
              }

              client
                .complete(key, experiments, handle)
                .then((result) => {
                  resolve({
                    order_id: result.data.order_id,
                    order_status_url: result.data.order_status_url,
                    total_amount: result.data.total_amount,
                    payment_id: handle.razorpay_payment_id,
                    status: result.status,
                  });
                })
                .catch((err) => {
                  // Every phase-3 rejection must carry the handle -- it is
                  // the on-call recovery path for a payment that was
                  // captured but never turned into a Shopify order.
                  const normalized = asMagicCheckoutError(err, 'non_error_rejection');
                  normalized.details = Object.assign({}, normalized.details, { handle });
                  reject(normalized);
                });
            },
            onError: (data) => {
              if (!acceptEvent()) return;
              // A dismissal (or native error) means no payment was taken.
              // Phase 3 (`complete`) must never run here -- there is nothing
              // to place and nothing to recover.
              const cancelled = data && data.code === NATIVE_PAYMENT_CANCELED;
              reject(
                new MagicCheckoutError(
                  cancelled
                    ? MAGIC_ERROR_CODES.CHECKOUT_CANCELLED
                    : MAGIC_ERROR_CODES.PAYMENT_FAILED,
                  cancelled ? 'user_cancelled' : 'gateway_error',
                  data
                )
              );
            },
          });

          try {
            // Exactly the option set the modal needs. Magic activates from
            // the order's line_items_total plus the merchant's server-side
            // 1CC feature flag, so no cart, price, or shop id ever needs to
            // travel to the device here.
            host.open({ key, order_id, one_click_checkout: true });
          } catch (e) {
            // A host that throws synchronously on open() must not leave the
            // listener registered -- there will be no PAYMENT_SUCCESS or
            // PAYMENT_ERROR event coming to release it otherwise.
            if (acceptEvent()) {
              reject(
                new MagicCheckoutError(MAGIC_ERROR_CODES.PAYMENT_FAILED, 'host_open_threw', {
                  message: e && e.message,
                })
              );
            }
          }
        });
      });
  };
}
