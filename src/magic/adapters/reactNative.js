'use strict';

import {
  EVENT_NAMES,
  getEmitter,
  getNativeModule,
} from '../../internal/checkoutSession';

// Magic subscribes with per-call handles rather than reusing
// removeSubscriptions(), because that helper clears listeners globally and
// would tear down a concurrent open() as a side effect.
export function createReactNativeHost() {
  return {
    open(options) {
      getNativeModule().open(options);
    },
    subscribe({ onSuccess, onError }) {
      const emitter = getEmitter();
      const successSub = emitter.addListener(EVENT_NAMES.SUCCESS, onSuccess);
      const errorSub = emitter.addListener(EVENT_NAMES.ERROR, onError);
      return () => {
        successSub.remove();
        errorSub.remove();
      };
    },
  };
}

// React Native ships fetch, so this adds no dependency. It exists as a port so
// the core can be tested without a network and reused by a non-RN wrapper.
//
// RN's fetch never sets a timeout of its own -- on Android the socket read is
// unbounded -- so the wall-clock bound the core asks for has to be enforced
// here, with AbortController (also built into RN). An aborted request rejects,
// which the core already classifies as a transport failure and retries.
export function createFetchHttp() {
  return {
    post(url, body, options) {
      const timeout = options && options.timeout;
      const controller =
        typeof AbortController === 'function' && timeout > 0 ? new AbortController() : null;
      const timer = controller ? setTimeout(() => controller.abort(), timeout) : null;
      const clear = () => {
        if (timer) clearTimeout(timer);
      };

      const init = {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      };
      if (controller) init.signal = controller.signal;

      return fetch(url, init)
        .then((res) =>
          res
            .json()
            .catch(() => ({}))
            .then((data) => ({ status: res.status, data }))
        )
        .then(
          (result) => {
            clear();
            return result;
          },
          (err) => {
            clear();
            throw err;
          }
        );
    },
  };
}
