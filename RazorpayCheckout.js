'use strict';

import { NativeModules, NativeEventEmitter } from 'react-native';

const razorpayEvents = new NativeEventEmitter(NativeModules.RazorpayEventEmitter);

class RazorpayCheckout {

  static open(options, successCallback, errorCallback) {
    return new Promise(function(resolve, reject) {
      let removeSubscriptions = () => {
        razorpayEvents.removeAllListeners('Razorpay::onPaymentSuccess');
        razorpayEvents.removeAllListeners('Razorpay::onPaymentError');
      };
      razorpayEvents.addListener('Razorpay::onPaymentSuccess', (data) => {
        let resolveFn = successCallback || resolve;
        resolveFn(data);
        removeSubscriptions();
      });
      razorpayEvents.addListener('Razorpay::onPaymentError', (data) => {
        let rejectFn = errorCallback || reject;
        rejectFn(data);
        removeSubscriptions();
      });
      NativeModules.RazorpayCheckout.open(options);
    });
  }

}

export {RazorpayCheckout};
