'use strict';

import {
  EVENT_NAMES,
  getEmitter,
  removeSubscriptions,
  runCheckout,
} from './src/internal/checkoutSession';

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

  static onExternalWalletSelection(externalWalletCallback) {
    getEmitter().addListener(EVENT_NAMES.EXTERNAL_WALLET, (data) => {
      externalWalletCallback(data);
      removeSubscriptions();
    });
  }
}

export default RazorpayCheckout;
