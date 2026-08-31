const { createMagicCheckout } = require('../index');
const { makeOpenMagicCheckout } = require('../openMagicCheckout');
const { MAGIC_ERROR_CODES } = require('../errors');

function makeHost() {
  const host = {
    opened: [],
    handlers: null,
    unsubscribed: false,
    open: jest.fn((options) => host.opened.push(options)),
    subscribe: jest.fn((handlers) => {
      host.handlers = handlers;
      return () => {
        host.unsubscribed = true;
      };
    }),
  };
  return host;
}

function makeHttp(responses) {
  const queue = responses.slice();
  const calls = [];
  return {
    calls,
    post: jest.fn((url, body) => {
      calls.push({ url, body });
      const next = queue.shift();
      if (next instanceof Error) return Promise.reject(next);
      return Promise.resolve(next);
    }),
  };
}

const OPTIONS = {
  key: 'rzp_test_k',
  storefront_access_token: 'sf-token',
  cart_id: 'gid://shopify/Cart/c1-abc',
};

const SUCCESS = {
  razorpay_payment_id: 'pay_1',
  razorpay_order_id: 'order_1',
  razorpay_signature: 'sig_1',
};

function flush() {
  return new Promise((resolve) => setImmediate(resolve));
}

describe('openMagicCheckout', () => {
  it('should complete every phase then resolve with the shopify order', async () => {
    const host = makeHost();
    const http = makeHttp([
      { status: 200, data: { order_id: 'order_1', experiments: {} } },
      { status: 200, data: { order_id: 'shop_1', order_status_url: 'https://s/o/1' } },
    ]);
    const sdk = createMagicCheckout({ host, http, now: () => 0 });

    const promise = sdk.openMagicCheckout(OPTIONS);
    await flush();

    expect(host.opened[0]).toEqual({
      key: 'rzp_test_k',
      order_id: 'order_1',
      one_click_checkout: true,
    });

    host.handlers.onSuccess(SUCCESS);
    await expect(promise).resolves.toMatchObject({
      order_id: 'shop_1',
      order_status_url: 'https://s/o/1',
      payment_id: 'pay_1',
      status: 'placed',
    });
  });

  it('should surface the shopify total then include total_amount in the resolved result', async () => {
    const host = makeHost();
    const http = makeHttp([
      { status: 200, data: { order_id: 'order_1' } },
      { status: 200, data: { order_id: 'shop_1', total_amount: 49900 } },
    ]);
    const sdk = createMagicCheckout({ host, http, now: () => 0 });

    const promise = sdk.openMagicCheckout(OPTIONS);
    await flush();
    host.handlers.onSuccess(SUCCESS);

    await expect(promise).resolves.toMatchObject({ total_amount: 49900 });
  });

  it('should never send cart data to the modal then pass only key and order id', async () => {
    const host = makeHost();
    const http = makeHttp([
      { status: 200, data: { order_id: 'order_1' } },
      { status: 200, data: {} },
    ]);
    const sdk = createMagicCheckout({ host, http, now: () => 0 });
    const promise = sdk.openMagicCheckout(OPTIONS);
    await flush();
    host.handlers.onSuccess(SUCCESS);
    await promise;

    expect(Object.keys(host.opened[0]).sort()).toEqual([
      'key',
      'one_click_checkout',
      'order_id',
    ]);
  });

  it('should not call complete when the user dismisses then reject as cancelled', async () => {
    const host = makeHost();
    const http = makeHttp([{ status: 200, data: { order_id: 'order_1' } }]);
    const sdk = createMagicCheckout({ host, http, now: () => 0 });

    const promise = sdk.openMagicCheckout(OPTIONS);
    await flush();
    host.handlers.onError({ code: 0, description: 'cancelled' });

    await expect(promise).rejects.toMatchObject({
      code: MAGIC_ERROR_CODES.CHECKOUT_CANCELLED,
    });
    expect(http.post).toHaveBeenCalledTimes(1);
    expect(host.unsubscribed).toBe(true);
  });

  it('should reject as payment failed then pass the native code through', async () => {
    const host = makeHost();
    const http = makeHttp([{ status: 200, data: { order_id: 'order_1' } }]);
    const sdk = createMagicCheckout({ host, http, now: () => 0 });

    const promise = sdk.openMagicCheckout(OPTIONS);
    await flush();
    host.handlers.onError({ code: 2, description: 'network' });

    await expect(promise).rejects.toMatchObject({
      code: MAGIC_ERROR_CODES.PAYMENT_FAILED,
      details: { code: 2, description: 'network' },
    });
    expect(host.unsubscribed).toBe(true);
  });

  it('should reject before opening the modal then never call host open on phase one failure', async () => {
    const host = makeHost();
    const http = makeHttp([{ status: 500, data: {} }]);
    const sdk = createMagicCheckout({ host, http, now: () => 0 });

    await expect(sdk.openMagicCheckout(OPTIONS)).rejects.toMatchObject({
      code: MAGIC_ERROR_CODES.ORDER_CREATE_FAILED,
    });
    expect(host.open).not.toHaveBeenCalled();
  });

  it('should resolve as pending then report status pending when MCS defers', async () => {
    const host = makeHost();
    const http = makeHttp([
      { status: 200, data: { order_id: 'order_1' } },
      { status: 422, data: { error: { code: 'DELEGATED_TO_SQS' } } },
    ]);
    const sdk = createMagicCheckout({ host, http, now: () => 0 });

    const promise = sdk.openMagicCheckout(OPTIONS);
    await flush();
    host.handlers.onSuccess(SUCCESS);

    await expect(promise).resolves.toMatchObject({ status: 'pending', payment_id: 'pay_1' });
  });

  it('should attach the handle then include it on every phase three rejection', async () => {
    const host = makeHost();
    const http = makeHttp([
      { status: 200, data: { order_id: 'order_1' } },
      { status: 400, data: { error: { code: 'BAD_SIGNATURE' } } },
    ]);
    const sdk = createMagicCheckout({ host, http, now: () => 0 });

    const promise = sdk.openMagicCheckout(OPTIONS);
    await flush();
    host.handlers.onSuccess(SUCCESS);

    await expect(promise).rejects.toMatchObject({
      code: MAGIC_ERROR_CODES.COMPLETE_FAILED,
      details: {
        handle: {
          razorpay_order_id: 'order_1',
          razorpay_payment_id: 'pay_1',
          razorpay_signature: 'sig_1',
          key: 'rzp_test_k',
        },
      },
    });
    expect(host.unsubscribed).toBe(true);
  });

  it('should unsubscribe then release the listener on every terminal path', async () => {
    const host = makeHost();
    const http = makeHttp([
      { status: 200, data: { order_id: 'order_1' } },
      { status: 200, data: {} },
    ]);
    const sdk = createMagicCheckout({ host, http, now: () => 0 });

    const promise = sdk.openMagicCheckout(OPTIONS);
    await flush();
    host.handlers.onSuccess(SUCCESS);
    await promise;

    expect(host.unsubscribed).toBe(true);
  });

  it('should reject as complete failed then attach a recoverable handle when the success payload is null', async () => {
    const host = makeHost();
    const http = makeHttp([{ status: 200, data: { order_id: 'order_1' } }]);
    const sdk = createMagicCheckout({ host, http, now: () => 0 });

    const promise = sdk.openMagicCheckout(OPTIONS);
    await flush();
    host.handlers.onSuccess(null);

    await expect(promise).rejects.toMatchObject({
      code: MAGIC_ERROR_CODES.COMPLETE_FAILED,
      reason: 'invalid_success_payload',
      details: {
        handle: { razorpay_order_id: 'order_1', key: 'rzp_test_k' },
      },
    });
    // A malformed payload must be rejected before phase 3 ever runs -- only
    // the phase-1 init call should have gone out.
    expect(http.post).toHaveBeenCalledTimes(1);
    expect(host.unsubscribed).toBe(true);
  });

  it('should reject as complete failed then attach a recoverable handle when the payment id is blank', async () => {
    const host = makeHost();
    const http = makeHttp([{ status: 200, data: { order_id: 'order_1' } }]);
    const sdk = createMagicCheckout({ host, http, now: () => 0 });

    const promise = sdk.openMagicCheckout(OPTIONS);
    await flush();
    host.handlers.onSuccess({ razorpay_payment_id: '', razorpay_order_id: 'order_1' });

    await expect(promise).rejects.toMatchObject({
      code: MAGIC_ERROR_CODES.COMPLETE_FAILED,
      reason: 'invalid_success_payload',
    });
    expect(http.post).toHaveBeenCalledTimes(1);
  });

  it('should ignore a late error after success then still resolve the placed order', async () => {
    const host = makeHost();
    const http = makeHttp([
      { status: 200, data: { order_id: 'order_1' } },
      { status: 200, data: { order_id: 'shop_1' } },
    ]);
    const sdk = createMagicCheckout({ host, http, now: () => 0 });

    const promise = sdk.openMagicCheckout(OPTIONS);
    await flush();
    // Fire success, then -- before phase 3 has a chance to resolve -- fire a
    // stray late error on the same listener. The first event must win.
    host.handlers.onSuccess(SUCCESS);
    host.handlers.onError({ code: 2, description: 'late' });

    await expect(promise).resolves.toMatchObject({ status: 'placed', order_id: 'shop_1' });
    expect(http.post).toHaveBeenCalledTimes(2);
  });

  it('should ignore a late success after dismissal then never call complete', async () => {
    const host = makeHost();
    const http = makeHttp([{ status: 200, data: { order_id: 'order_1' } }]);
    const sdk = createMagicCheckout({ host, http, now: () => 0 });

    const promise = sdk.openMagicCheckout(OPTIONS);
    await flush();
    host.handlers.onError({ code: 0, description: 'cancelled' });
    host.handlers.onSuccess(SUCCESS);

    await expect(promise).rejects.toMatchObject({
      code: MAGIC_ERROR_CODES.CHECKOUT_CANCELLED,
    });
    // The late success must never reach phase 3 -- only the phase-1 init
    // call should have gone out.
    expect(http.post).toHaveBeenCalledTimes(1);
  });

  it('should reject then release the listener when host.open throws synchronously', async () => {
    const host = makeHost();
    host.open = jest.fn(() => {
      throw new Error('modal boom');
    });
    const http = makeHttp([{ status: 200, data: { order_id: 'order_1' } }]);
    const sdk = createMagicCheckout({ host, http, now: () => 0 });

    await expect(sdk.openMagicCheckout(OPTIONS)).rejects.toMatchObject({
      code: MAGIC_ERROR_CODES.PAYMENT_FAILED,
      reason: 'host_open_threw',
    });
    expect(host.unsubscribed).toBe(true);
  });

  it('should normalise a non-error rejection then still attach the handle', async () => {
    const host = makeHost();
    const client = {
      init: jest.fn(() => Promise.resolve({ order_id: 'order_1', experiments: {} })),
      complete: jest.fn(() => Promise.reject('a plain string rejection')),
    };
    const openMagicCheckout = makeOpenMagicCheckout({ host, client });

    const promise = openMagicCheckout(OPTIONS);
    await flush();
    host.handlers.onSuccess(SUCCESS);

    await expect(promise).rejects.toMatchObject({
      code: MAGIC_ERROR_CODES.COMPLETE_FAILED,
      details: {
        handle: {
          razorpay_order_id: 'order_1',
          razorpay_payment_id: 'pay_1',
          razorpay_signature: 'sig_1',
          key: 'rzp_test_k',
        },
      },
    });
  });

  const invalid = {
    'should reject when key is missing then report missing_key': [
      { storefront_access_token: 't', cart_id: 'c' },
      'missing_key',
    ],
    'should reject when cart_id is missing then report missing_cart_id': [
      { key: 'k', storefront_access_token: 't' },
      'missing_cart_id',
    ],
    'should reject when the storefront token is missing then report missing_storefront_access_token': [
      { key: 'k', cart_id: 'c' },
      'missing_storefront_access_token',
    ],
    'should reject a cart object then report cart_not_allowed': [
      { key: 'k', cart_id: 'c', storefront_access_token: 't', shopify_cart: { items: [] } },
      'cart_not_allowed',
    ],
    'should reject a bare cart object then report cart_not_allowed': [
      { key: 'k', cart_id: 'c', storefront_access_token: 't', cart: { items: [] } },
      'cart_not_allowed',
    ],
    'should reject line items then report cart_not_allowed': [
      { key: 'k', cart_id: 'c', storefront_access_token: 't', line_items: [{ id: 1 }] },
      'cart_not_allowed',
    ],
  };

  Object.entries(invalid).forEach(([name, [options, reason]]) => {
    it(name, async () => {
      const host = makeHost();
      const http = makeHttp([]);
      const sdk = createMagicCheckout({ host, http, now: () => 0 });
      await expect(sdk.openMagicCheckout(options)).rejects.toMatchObject({
        code: MAGIC_ERROR_CODES.INVALID_OPTIONS,
        reason,
      });
      expect(http.post).not.toHaveBeenCalled();
    });
  });
});
