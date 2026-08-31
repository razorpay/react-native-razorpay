const { createClient } = require('../client');
const { MAGIC_ERROR_CODES } = require('../errors');

function makeHttp(responses) {
  const calls = [];
  const queue = responses.slice();
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

describe('init', () => {
  it('should post the cart id and token then return order id and experiments', async () => {
    const http = makeHttp([
      { status: 200, data: { order_id: 'order_1', experiments: { a: 'b' } } },
    ]);
    const res = await createClient(http).init('k', {
      cart_id: 'gid://shopify/Cart/c1-a',
      storefront_access_token: 't',
    });
    expect(res).toEqual({
      order_id: 'order_1',
      experiments: { a: 'b' },
      poll_budget_ms: 8000,
    });
    expect(http.calls[0].url).toContain('/magic/shopify/init?key_id=k');
    expect(http.calls[0].body).toEqual({
      cart_id: 'gid://shopify/Cart/c1-a',
      storefront_access_token: 't',
    });
  });

  it('should reject with ORDER_CREATE_FAILED then set reason http_400 on a 4xx', async () => {
    const http = makeHttp([{ status: 400, data: { error: 'bad' } }]);
    await expect(createClient(http).init('k', {})).rejects.toMatchObject({
      code: MAGIC_ERROR_CODES.ORDER_CREATE_FAILED,
      reason: 'http_400',
    });
  });

  it('should reject with ORDER_CREATE_FAILED then set reason network on a transport error', async () => {
    const http = makeHttp([new Error('offline')]);
    await expect(createClient(http).init('k', {})).rejects.toMatchObject({
      code: MAGIC_ERROR_CODES.ORDER_CREATE_FAILED,
      reason: 'network',
    });
  });

  it('should reject with ORDER_CREATE_FAILED then set reason missing_order_id when absent', async () => {
    const http = makeHttp([{ status: 200, data: { experiments: {} } }]);
    await expect(createClient(http).init('k', {})).rejects.toMatchObject({
      reason: 'missing_order_id',
    });
  });

  it('should carry a server-supplied budget then return it alongside the order id', async () => {
    const http = makeHttp([{ status: 200, data: { order_id: 'order_1', poll_budget_ms: 3000 } }]);
    const res = await createClient(http).init('k', {});
    expect(res.poll_budget_ms).toBe(3000);
  });

  const untrustedBudgets = {
    'should ignore a missing budget then fall back to the compiled default': undefined,
    'should ignore a non-numeric budget then fall back to the compiled default': '3000',
    'should ignore a null budget then fall back to the compiled default': null,
    'should ignore an absurdly large budget then fall back to the compiled default': 900000,
    'should ignore a sub-round-trip budget then fall back to the compiled default': 1,
    'should ignore a negative budget then fall back to the compiled default': -1,
  };

  Object.entries(untrustedBudgets).forEach(([name, poll_budget_ms]) => {
    it(name, async () => {
      const http = makeHttp([{ status: 200, data: { order_id: 'order_1', poll_budget_ms } }]);
      const res = await createClient(http).init('k', {});
      expect(res.poll_budget_ms).toBe(8000);
    });
  });
});

describe('complete', () => {
  const handle = {
    razorpay_order_id: 'order_1',
    razorpay_payment_id: 'pay_1',
    razorpay_signature: 'sig',
    key: 'k',
  };

  it('should post the handle then return placed on 200', async () => {
    const http = makeHttp([{ status: 200, data: { order_id: 'shop_1' } }]);
    const res = await createClient(http).complete('k', undefined, handle, () => 0);
    expect(res.status).toBe('placed');
    expect(http.calls[0].body).toEqual(handle);
  });

  it('should treat a 422 already placed then return pending', async () => {
    const http = makeHttp([{ status: 422, data: { error: { code: 'ALREADY_PLACED' } } }]);
    const res = await createClient(http).complete('k', undefined, handle, () => 0);
    expect(res.status).toBe('pending');
  });

  it('should retry a 5xx then return placed when the retry succeeds', async () => {
    const http = makeHttp([
      { status: 500, data: {} },
      { status: 200, data: { order_id: 'shop_1' } },
    ]);
    let clock = 0;
    const res = await createClient(http).complete('k', undefined, handle, () => (clock += 100));
    expect(res.status).toBe('placed');
    expect(http.post).toHaveBeenCalledTimes(2);
  });

  it('should exhaust the budget then return pending without throwing', async () => {
    const http = makeHttp([
      { status: 500, data: {} },
      { status: 500, data: {} },
      { status: 500, data: {} },
    ]);
    let clock = 0;
    const res = await createClient(http).complete('k', undefined, handle, () => (clock += 5000));
    expect(res.status).toBe('pending');
  });

  it('should reject with COMPLETE_FAILED then set reason http_400 on a non-retryable 4xx', async () => {
    const http = makeHttp([{ status: 400, data: { error: { code: 'BAD_SIGNATURE' } } }]);
    await expect(
      createClient(http).complete('k', undefined, handle, () => 0)
    ).rejects.toMatchObject({ code: MAGIC_ERROR_CODES.COMPLETE_FAILED, reason: 'http_400' });
  });

  // MB1. The fake below stands in for a hung socket: it settles ONLY if the
  // caller handed it a positive timeout. Against an unbounded client.post this
  // test does not fail an assertion, it never returns -- which is exactly the
  // production outcome, a promise left pending over a captured payment.
  it('should bound a hung attempt then return pending inside the budget', async () => {
    const seen = [];
    const http = {
      post: jest.fn((url, body, options) => {
        seen.push(options);
        return new Promise((resolve, reject) => {
          if (options && options.timeout > 0) {
            setTimeout(() => reject(new Error('aborted')), options.timeout);
          }
        });
      }),
    };

    const res = await createClient(http).complete('k', undefined, handle, () => Date.now(), 100);

    expect(seen[0].timeout).toBeGreaterThan(0);
    expect(seen[0].timeout).toBeLessThanOrEqual(100);
    expect(res.status).toBe('pending');
  });

  it('should shrink the per-attempt timeout then never let one attempt outlive the budget', async () => {
    const seen = [];
    const http = {
      post: jest.fn((url, body, options) => {
        seen.push(options.timeout);
        return Promise.resolve({ status: 500, data: {} });
      }),
    };
    let clock = 0;
    await createClient(http).complete('k', undefined, handle, () => (clock += 2000), 8000);

    expect(seen.length).toBeGreaterThan(1);
    seen.forEach((timeout) => expect(timeout).toBeLessThanOrEqual(8000));
    expect(seen[1]).toBeLessThan(seen[0]);
  });

  it('should honour a server-supplied budget then stop retrying once it elapses', async () => {
    const http = makeHttp([
      { status: 500, data: {} },
      { status: 500, data: {} },
      { status: 500, data: {} },
    ]);
    let clock = 0;
    const res = await createClient(http).complete(
      'k',
      undefined,
      handle,
      () => (clock += 600),
      1000
    );
    expect(res.status).toBe('pending');
    // A 1s budget must not buy the 8s default's worth of attempts.
    expect(http.post).toHaveBeenCalledTimes(1);
  });

  it('should use the variant route then post to checkouts shopify complete', async () => {
    const http = makeHttp([{ status: 200, data: {} }]);
    await createClient(http).complete(
      'k',
      { shopify_pre_payment_guardrail: 'variant_on' },
      handle,
      () => 0
    );
    expect(http.calls[0].url).toContain('/checkouts/shopify/complete');
  });
});
