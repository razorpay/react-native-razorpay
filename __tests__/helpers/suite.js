const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');

// Each suite loads the SDK fresh. RazorpayCheckout.js builds a module-scoped
// NativeEventEmitter at import time, so without resetModules one test's
// listeners leak into the next and failures look like ordering flakes.
// resetModules also gives a fresh react-native mock, so `instances` starts
// empty and the last entry is always this suite's emitter.
function makeSuite() {
  jest.resetModules();
  const RN = require('react-native');
  const RazorpayCheckout = require(path.join(ROOT, 'RazorpayCheckout.js')).default;
  const emitter = RN.NativeEventEmitter.instances[RN.NativeEventEmitter.instances.length - 1];
  return { RN, RazorpayCheckout, emitter, native: RN.NativeModules.RNRazorpayCheckout };
}

const EVENTS = {
  success: 'Razorpay::PAYMENT_SUCCESS',
  error: 'Razorpay::PAYMENT_ERROR',
  wallet: 'Razorpay::EXTERNAL_WALLET_SELECTED',
};

module.exports = { makeSuite, EVENTS };
