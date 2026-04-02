'use strict';

import { NativeModules, NativeEventEmitter } from 'react-native';

// Runtime detection for new architecture.
// RN <0.74 uses __turboModuleProxy; RN >=0.74 (bridgeless) exposes TurboModuleRegistry and nativeFabricUIManager instead.
const isTurboModuleEnabled =
  global.__turboModuleProxy != null ||
  global.TurboModuleRegistry != null ||
  global.nativeFabricUIManager != null;

let RazorpayCheckoutModule;
let RazorpayEventEmitterModule;

if (isTurboModuleEnabled) {
  // New Architecture - Try to load TurboModule specs
  try {
    RazorpayCheckoutModule = require('./src/NativeRazorpayCheckout').default;
    RazorpayEventEmitterModule = require('./src/NativeRazorpayEventEmitter').default;
  } catch (error) {
    // Fallback to old architecture if TurboModule not available
    RazorpayCheckoutModule = NativeModules.RNRazorpayCheckout;
    RazorpayEventEmitterModule = NativeModules.RazorpayEventEmitter;
  }
} else {
  // Old Architecture
  RazorpayCheckoutModule = NativeModules.RNRazorpayCheckout;
  RazorpayEventEmitterModule = NativeModules.RazorpayEventEmitter;
}

const razorpayEvents = new NativeEventEmitter(RazorpayEventEmitterModule);

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
      RazorpayCheckoutModule.open(options);
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
