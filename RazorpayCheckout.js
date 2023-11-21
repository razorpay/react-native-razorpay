'use strict';

import { NativeModules, NativeEventEmitter } from 'react-native';

const razorpayEvents = new NativeEventEmitter(NativeModules.RazorpayEventEmitter);

const removeSubscriptions = () => {
  razorpayEvents.removeAllListeners('Razorpay::PAYMENT_SUCCESS');
  razorpayEvents.removeAllListeners('Razorpay::PAYMENT_ERROR');
  razorpayEvents.removeAllListeners('Razorpay::EXTERNAL_WALLET_SELECTED');
};

class RazorpayCheckout {
  static open(options, successCallback, errorCallback) {
    return new Promise(function(resolve, reject) {
      razorpayEvents.addListener('Razorpay::PAYMENT_SUCCESS', (data) => {
        let resolveFn = successCallback || resolve;
        resolveFn(data);
        removeSubscriptions();
      });
      razorpayEvents.addListener('Razorpay::PAYMENT_ERROR', (data) => {
        let rejectFn = errorCallback || reject;
        rejectFn(data);
        removeSubscriptions();
      });
      setTimeout(function() {
        NativeModules.RNRazorpayCheckout.open(options);
      }, 3000);
    });
  }
  static onExternalWalletSelection(externalWalletCallback) {
    razorpayEvents.addListener('Razorpay::EXTERNAL_WALLET_SELECTED', (data) => {
      externalWalletCallback(data);
      removeSubscriptions();
    });
  }
}

export default RazorpayCheckout;
