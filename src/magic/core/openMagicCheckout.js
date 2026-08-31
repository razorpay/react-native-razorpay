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

          unsubscribe = host.subscribe({
            onSuccess: (data) => {
              // The handle is the only way to recover a captured payment whose
              // order never got placed, so it is built the instant onSuccess
              // fires -- never inside a catch -- and threaded through every
              // phase-3 outcome from here on, success or failure.
              const handle = {
                razorpay_order_id: data.razorpay_order_id || order_id,
                razorpay_payment_id: data.razorpay_payment_id,
                razorpay_signature: data.razorpay_signature,
                key,
              };
              client
                .complete(key, experiments, handle)
                .then((result) => {
                  release();
                  resolve({
                    order_id: result.data.order_id,
                    order_status_url: result.data.order_status_url,
                    payment_id: handle.razorpay_payment_id,
                    status: result.status,
                  });
                })
                .catch((err) => {
                  release();
                  // Every phase-3 rejection must carry the handle -- it is the
                  // on-call recovery path for a payment that was captured but
                  // never turned into a Shopify order.
                  err.details = Object.assign({}, err.details, { handle });
                  reject(err);
                });
            },
            onError: (data) => {
              // A dismissal means no payment was taken. Phase 3 (`complete`)
              // must never run here -- there is nothing to place and nothing
              // to recover, so we release the listener and reject directly.
              release();
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

          // Exactly the option set the modal needs. Magic activates from the
          // order's line_items_total plus the merchant's server-side 1CC
          // feature flag, so no cart, price, or shop id ever needs to travel
          // to the device here.
          host.open({ key, order_id, one_click_checkout: true });
        });
      });
  };
}
