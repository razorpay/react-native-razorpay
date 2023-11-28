'use strict';

import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

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
      if (Platform.OS == 'ios') {
        setTimeout(function() {
          NativeModules.RNRazorpayCheckout.open(options);
        }, 500); 
      } else {
        NativeModules.RNRazorpayCheckout.open(options);
      }
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
