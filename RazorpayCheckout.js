'use strict';

import {
  EVENT_NAMES,
  getEmitter,
  removeSubscriptions,
  runCheckout,
} from './src/internal/checkoutSession';
import { createMagicCheckout } from './src/magic/core';
import {
  createReactNativeHost,
  createFetchHttp,
} from './src/magic/adapters/reactNative';

// Built lazily so importing RazorpayCheckout.js never touches the native
// bridge until a Magic checkout is actually requested.
let magic;
function getMagic() {
  if (!magic) {
    magic = createMagicCheckout({
      host: createReactNativeHost(),
      http: createFetchHttp(),
    });
  }
  return magic;
}

class RazorpayCheckout {
  static open(options, successCallback, errorCallback) {
    return new Promise(function (resolve, reject) {
      runCheckout(options, {
        onSuccess: (data) => (successCallback || resolve)(data),
        onError: (data) => (errorCallback || reject)(data),
        teardown: removeSubscriptions,
      });
    });
  }

  static openMagicCheckout(options) {
    return getMagic().openMagicCheckout(options);
  }

  static onExternalWalletSelection(externalWalletCallback) {
    getEmitter().addListener(EVENT_NAMES.EXTERNAL_WALLET, (data) => {
      externalWalletCallback(data);
      removeSubscriptions();
    });
  }
}

export default RazorpayCheckout;
