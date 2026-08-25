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

const ORDER_API_ERROR = 'ORDER_API_ERROR';
const NETWORK_ERROR = 'NETWORK_ERROR';

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

  /**
   * Calls an HTTP endpoint (defaults to a JSONPlaceholder mock), logs the response,
   * maps it into checkout options, then opens the standard payment sheet.
   *
   * The native layer, event flow, and promise semantics are identical to open().
   *
   * @param {object} payload       Arbitrary data sent to the API (e.g. cart contents)
   * @param {object} [apiConfig]   Override URL/headers. Defaults to JSONPlaceholder POST /posts
   * @param {object} [options]     Standard Checkout options (key, name, prefill, theme...)
   * @returns {Promise<object>}    Resolves with PAYMENT_SUCCESS payload, rejects with PAYMENT_ERROR
   */
  static async createAndOpen(payload, apiConfig, options = {}) {
    const config = apiConfig || {
      url: 'https://jsonplaceholder.typicode.com/posts',
      headers: {},
    };

    let response;
    try {
      const res = await fetch(config.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...config.headers },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw { code: ORDER_API_ERROR, status: res.status, description: await res.text() };
      }
      response = await res.json();
    } catch (err) {
      if (err && err.code === ORDER_API_ERROR) throw err;
      throw { code: NETWORK_ERROR, description: 'order API unreachable', cause: String(err) };
    }

    // JSONPlaceholder echoes the body back and assigns a numeric id.
    // A real integration would map { order_id, amount, currency } from its backend here.
    console.log('[RazorpayCheckout] order API response:', response);

    return RazorpayCheckout.open({
      ...options,
      order_id: options.order_id || String(response.id),
      currency: options.currency || 'INR',
    });
  }
}

export default RazorpayCheckout;
