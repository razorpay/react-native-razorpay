'use strict';

import { NativeModules, NativeEventEmitter } from 'react-native';

const razorpayEvents = NativeModules.RazorpayEventEmitter || Platform.OS !== 'ios' ? new NativeEventEmitter(NativeModules.RazorpayEventEmitter) : null;

const removeSubscriptions = () => {
  if (!razorpayEvents) {
    return;
  }
  razorpayEvents.removeAllListeners('Razorpay::PAYMENT_SUCCESS');
  razorpayEvents.removeAllListeners('Razorpay::PAYMENT_ERROR');
  razorpayEvents.removeAllListeners('Razorpay::EXTERNAL_WALLET_SELECTED');
};

class RazorpayCheckout {
  static open(options, successCallback, errorCallback) {
    return new Promise(function(resolve, reject) {
      if (!NativeModules.RazorpayCheckout || !razorpayEvents) {
        errorCallback({ code: 'RAZORPAY_NOT_INAPP', description: 'razorpay is not added in this app' });
        return;
      }
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
      NativeModules.RazorpayCheckout.open(options);
    });
  }
  static onExternalWalletSelection(externalWalletCallback) {
    if (!razorpayEvents) {
      return;
    }
    razorpayEvents.addListener('Razorpay::EXTERNAL_WALLET_SELECTED', (data) => {
      externalWalletCallback(data);
      removeSubscriptions();
    });
  }
}

export default RazorpayCheckout;
