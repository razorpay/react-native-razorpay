const { makeSuite, EVENTS } = require('./helpers/suite');

describe('open() behaviour is frozen', () => {
  it('should call the native module then pass options through untouched', () => {
    const ts = makeSuite();
    const options = { key: 'rzp_test_1', amount: '100', nested: { a: [1, 2] } };
    ts.RazorpayCheckout.open(options);
    expect(ts.native.open).toHaveBeenCalledWith(options);
  });

  it('should resolve the promise then return the success payload', async () => {
    const ts = makeSuite();
    const promise = ts.RazorpayCheckout.open({ key: 'k' });
    ts.emitter.emit(EVENTS.success, { razorpay_payment_id: 'pay_1' });
    await expect(promise).resolves.toEqual({ razorpay_payment_id: 'pay_1' });
  });

  it('should reject the promise then return the error payload', async () => {
    const ts = makeSuite();
    const promise = ts.RazorpayCheckout.open({ key: 'k' });
    ts.emitter.emit(EVENTS.error, { code: 0, description: 'cancelled' });
    await expect(promise).rejects.toEqual({ code: 0, description: 'cancelled' });
  });

  it('should prefer successCallback then never resolve the promise', async () => {
    const ts = makeSuite();
    const onSuccess = jest.fn();
    let settled = false;
    ts.RazorpayCheckout.open({ key: 'k' }, onSuccess).then(() => { settled = true; });
    ts.emitter.emit(EVENTS.success, { razorpay_payment_id: 'pay_1' });
    await Promise.resolve();
    expect(onSuccess).toHaveBeenCalledWith({ razorpay_payment_id: 'pay_1' });
    expect(settled).toBe(false);
  });

  it('should prefer errorCallback then never reject the promise', async () => {
    const ts = makeSuite();
    const onError = jest.fn();
    const promise = ts.RazorpayCheckout.open({ key: 'k' }, undefined, onError);
    promise.catch(() => { throw new Error('promise must not reject'); });
    ts.emitter.emit(EVENTS.error, { code: 2 });
    await Promise.resolve();
    expect(onError).toHaveBeenCalledWith({ code: 2 });
  });

  // QUIRK, DELIBERATELY LOCKED: teardown is global, not per-call. Anything that
  // "fixes" this changes shipped behaviour for every existing integration.
  it('should remove every listener on first success then leave zero registered', () => {
    const ts = makeSuite();
    ts.RazorpayCheckout.open({ key: 'k' });
    ts.RazorpayCheckout.onExternalWalletSelection(() => {});
    ts.emitter.emit(EVENTS.success, { razorpay_payment_id: 'pay_1' });
    expect(ts.emitter.listenerCount(EVENTS.success)).toBe(0);
    expect(ts.emitter.listenerCount(EVENTS.error)).toBe(0);
    expect(ts.emitter.listenerCount(EVENTS.wallet)).toBe(0);
  });

  // QUIRK, DELIBERATELY LOCKED: the wallet callback also tears down the payment
  // listeners, so a wallet selection can orphan an in-flight open().
  it('should remove payment listeners on wallet selection then leave zero registered', () => {
    const ts = makeSuite();
    ts.RazorpayCheckout.open({ key: 'k' });
    ts.RazorpayCheckout.onExternalWalletSelection(() => {});
    ts.emitter.emit(EVENTS.wallet, { external_wallet: 'paytm' });
    expect(ts.emitter.listenerCount(EVENTS.success)).toBe(0);
  });
});
