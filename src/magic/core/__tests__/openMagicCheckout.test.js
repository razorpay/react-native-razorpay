const { createMagicCheckout } = require('../index');
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
