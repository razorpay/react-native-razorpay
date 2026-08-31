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
  try {
    RazorpayCheckoutModule = require('../NativeRazorpayCheckout').default;
    RazorpayEventEmitterModule = require('../NativeRazorpayEventEmitter').default;
  } catch (error) {
    RazorpayCheckoutModule = NativeModules.RNRazorpayCheckout;
    RazorpayEventEmitterModule = NativeModules.RazorpayEventEmitter;
  }
} else {
  RazorpayCheckoutModule = NativeModules.RNRazorpayCheckout;
  RazorpayEventEmitterModule = NativeModules.RazorpayEventEmitter;
}

const razorpayEvents = new NativeEventEmitter(RazorpayEventEmitterModule);

export const EVENT_NAMES = {
  SUCCESS: 'Razorpay::PAYMENT_SUCCESS',
  ERROR: 'Razorpay::PAYMENT_ERROR',
  EXTERNAL_WALLET: 'Razorpay::EXTERNAL_WALLET_SELECTED',
};

export function getEmitter() {
  return razorpayEvents;
}

export function getNativeModule() {
  return RazorpayCheckoutModule;
}

export function removeSubscriptions() {
  razorpayEvents.removeAllListeners(EVENT_NAMES.SUCCESS);
  razorpayEvents.removeAllListeners(EVENT_NAMES.ERROR);
  razorpayEvents.removeAllListeners(EVENT_NAMES.EXTERNAL_WALLET);
}

// Wires the two payment listeners and launches the native checkout.
//
// `teardown` is a parameter rather than a hardcoded removeSubscriptions()
// because Magic must keep listening past the first success: it still has a
// Shopify order to place. open() passes the original teardown and so keeps
// its shipped behaviour exactly.
export function runCheckout(options, { onSuccess, onError, teardown }) {
  razorpayEvents.addListener(EVENT_NAMES.SUCCESS, (data) => {
    onSuccess(data);
    teardown();
  });
  razorpayEvents.addListener(EVENT_NAMES.ERROR, (data) => {
    onError(data);
    teardown();
  });
  RazorpayCheckoutModule.open(options);
}
