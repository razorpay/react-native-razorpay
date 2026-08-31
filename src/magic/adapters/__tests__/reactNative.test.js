const { createFetchHttp } = require('../reactNative');

// Stands in for a socket that accepts the request and then goes silent — the
// Android case, where the underlying read has no timeout at all. It only ever
// settles if the caller aborts it.
function hangingFetch() {
  return jest.fn(
    (url, init) =>
      new Promise((resolve, reject) => {
        const signal = init && init.signal;
        if (signal) signal.addEventListener('abort', () => reject(new Error('Aborted')));
      })
  );
}

describe('createFetchHttp', () => {
  afterEach(() => {
    delete global.fetch;
  });

  it('should post json then resolve with the status and the parsed body', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({ status: 200, json: () => Promise.resolve({ order_id: 'order_1' }) })
    );

    const res = await createFetchHttp().post('https://api/x', { cart_id: 'c1' });

    expect(res).toEqual({ status: 200, data: { order_id: 'order_1' } });
    expect(global.fetch.mock.calls[0][1].body).toBe(JSON.stringify({ cart_id: 'c1' }));
  });

  // MB1. Without the abort wiring this test does not fail an assertion, it
  // never returns — which is the production outcome after a payment is taken.
  it('should abort a hung request then reject once the timeout elapses', async () => {
    global.fetch = hangingFetch();

    await expect(
      createFetchHttp().post('https://api/x', {}, { timeout: 20 })
    ).rejects.toBeInstanceOf(Error);
  });

  it('should pass an abort signal then let the transport cancel the request', async () => {
    global.fetch = hangingFetch();

    createFetchHttp()
      .post('https://api/x', {}, { timeout: 20 })
      .catch(() => {});

    expect(global.fetch.mock.calls[0][1].signal).toBeDefined();
  });

  it('should omit the signal then leave an untimed request unbounded', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({ status: 200, json: () => Promise.resolve({}) })
    );

    await createFetchHttp().post('https://api/x', {});

    expect(global.fetch.mock.calls[0][1].signal).toBeUndefined();
  });

  it('should tolerate a non-json body then resolve with an empty data object', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({ status: 502, json: () => Promise.reject(new Error('not json')) })
    );

    await expect(createFetchHttp().post('https://api/x', {}, { timeout: 500 })).resolves.toEqual({
      status: 502,
      data: {},
    });
  });
});
