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
export function createFetchHttp() {
  return {
    post(url, body) {
      return fetch(url, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).then((res) =>
        res
          .json()
          .catch(() => ({}))
          .then((data) => ({ status: res.status, data }))
      );
    },
  };
}
