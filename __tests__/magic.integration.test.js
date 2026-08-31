const { makeSuite, EVENTS } = require('./helpers/suite');

describe('openMagicCheckout through the RN adapter', () => {
  const OPTIONS = {
    key: 'rzp_test_k',
    storefront_access_token: 'sf-token',
    cart_id: 'gid://shopify/Cart/c1-abc',
  };

  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    delete global.fetch;
  });

  function respond(bodies) {
    const queue = bodies.slice();
    global.fetch.mockImplementation(() => {
      const next = queue.shift();
      return Promise.resolve({
        status: next.status,
        json: () => Promise.resolve(next.body),
      });
    });
  }

  it('should open the native modal then resolve after completion', async () => {
    respond([
      { status: 200, body: { order_id: 'order_1', experiments: {} } },
      { status: 200, body: { order_id: 'shop_1', order_status_url: 'https://s/o/1' } },
    ]);
    const ts = makeSuite();

    const promise = ts.RazorpayCheckout.openMagicCheckout(OPTIONS);
    await new Promise((r) => setImmediate(r));

    expect(ts.native.open).toHaveBeenCalledWith({
      key: 'rzp_test_k',
      order_id: 'order_1',
      one_click_checkout: true,
    });

    ts.emitter.emit(EVENTS.success, {
      razorpay_payment_id: 'pay_1',
      razorpay_order_id: 'order_1',
      razorpay_signature: 'sig_1',
    });

    await expect(promise).resolves.toMatchObject({ order_id: 'shop_1', status: 'placed' });
  });

  it('should leave open() untouched then keep its listeners working', async () => {
    const ts = makeSuite();
    const promise = ts.RazorpayCheckout.open({ key: 'k' });
    ts.emitter.emit(EVENTS.success, { razorpay_payment_id: 'pay_2' });
    await expect(promise).resolves.toEqual({ razorpay_payment_id: 'pay_2' });
  });

  it('should release its listener then leave none registered after Magic resolves', async () => {
    respond([
      { status: 200, body: { order_id: 'order_1' } },
      { status: 200, body: {} },
    ]);
    const ts = makeSuite();
    const promise = ts.RazorpayCheckout.openMagicCheckout(OPTIONS);
    await new Promise((r) => setImmediate(r));
    ts.emitter.emit(EVENTS.success, { razorpay_payment_id: 'pay_1' });
    await promise;
    expect(ts.emitter.listenerCount(EVENTS.success)).toBe(0);
  });

  // Discriminator: emptying the success-listener count to zero is not proof
  // of per-call teardown by itself, since removeSubscriptions() also drives
  // it to zero (by clearing globally). A bystander listener registered on a
  // *different* event before Magic starts is the thing that only survives if
  // Magic's unsubscribe removes exactly the two handles it added.
  it('should leave an unrelated wallet listener registered then not touch it on Magic teardown', async () => {
    respond([
      { status: 200, body: { order_id: 'order_1' } },
      { status: 200, body: {} },
    ]);
    const ts = makeSuite();
    ts.RazorpayCheckout.onExternalWalletSelection(() => {});

    const promise = ts.RazorpayCheckout.openMagicCheckout(OPTIONS);
    await new Promise((r) => setImmediate(r));
    ts.emitter.emit(EVENTS.success, { razorpay_payment_id: 'pay_1' });
    await promise;

    expect(ts.emitter.listenerCount(EVENTS.wallet)).toBe(1);
  });
});
