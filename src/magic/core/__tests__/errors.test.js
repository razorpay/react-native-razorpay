const { MagicCheckoutError, MAGIC_ERROR_CODES } = require('../errors');

describe('MagicCheckoutError', () => {
  it('should build an error then expose code reason and details', () => {
    const err = new MagicCheckoutError(MAGIC_ERROR_CODES.ORDER_CREATE_FAILED, 'network', {
      status: 0,
    });
    expect(err.code).toBe('MAGIC_ORDER_CREATE_FAILED');
    expect(err.reason).toBe('network');
    expect(err.details).toEqual({ status: 0 });
  });

  it('should extend Error then remain instanceof Error', () => {
    const err = new MagicCheckoutError(MAGIC_ERROR_CODES.PAYMENT_FAILED, 'user_cancelled');
    expect(err instanceof Error).toBe(true);
    expect(err.name).toBe('MagicCheckoutError');
  });

  it('should default details then return an empty object', () => {
    expect(new MagicCheckoutError(MAGIC_ERROR_CODES.INVALID_OPTIONS, 'missing_key').details).toEqual({});
  });

  it('should expose every documented code then match the taxonomy', () => {
    expect(MAGIC_ERROR_CODES).toEqual({
      ORDER_CREATE_FAILED: 'MAGIC_ORDER_CREATE_FAILED',
      CHECKOUT_CANCELLED: 'MAGIC_CHECKOUT_CANCELLED',
      PAYMENT_FAILED: 'MAGIC_PAYMENT_FAILED',
      COMPLETE_FAILED: 'MAGIC_COMPLETE_FAILED',
      INVALID_OPTIONS: 'MAGIC_INVALID_OPTIONS',
    });
  });
});
