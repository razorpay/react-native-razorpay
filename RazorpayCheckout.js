'use strict';

import { NativeModules, NativeEventEmitter } from 'react-native';

const razorpayEvents = new NativeEventEmitter(NativeModules.RazorpayEventEmitter);

const removeSubscriptions = () => {
  razorpayEvents.removeAllListeners('Razorpay::PAYMENT_SUCCESS');
  razorpayEvents.removeAllListeners('Razorpay::PAYMENT_ERROR');
  razorpayEvents.removeAllListeners('Razorpay::TURBO_SESSION_TOKEN_REQUESTED');
};

// Helper function to validate Turbo availability based on header detection
const validateTurboAvailability = async () => {
  const isAvailable = await NativeModules.RNRazorpayCheckout.isTurboAvailable();
  
  if (!isAvailable) {
    throw new Error('Turbo UPI is not available. TurboUpiPluginUI header not found.');
  }
  
  return true;
};

class RazorpayCheckout {
  // Core payment method - equivalent to razorpay.open() in Swift
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
      NativeModules.RNRazorpayCheckout.open(options);
    });
  }

  // Check Turbo UPI availability based on header file detection
  static async isTurboAvailable() {
    try {
      console.log('🔍 [TURBO] Checking TurboUpiPluginUI header availability');
      
      const result = await NativeModules.RNRazorpayCheckout.isTurboAvailable();
      console.log('📤 [TURBO] Header detection result:', result);
      return result;
    } catch (error) {
      console.error('❌ [TURBO] Failed to check header availability:', error);
      return false;
    }
  }

  // Initialize Turbo UPI - equivalent to razorpay.upiTurbo.initialize() in Swift
  static async initializeTurbo(razorpayKey) {
    try {
      await validateTurboAvailability();
      
      if (!razorpayKey || typeof razorpayKey !== 'string') {
        throw new Error('Valid Razorpay key is required for Turbo initialization');
      }
      
      return await NativeModules.RNRazorpayCheckout.initializeTurbo(razorpayKey);
    } catch (error) {
      console.error('[RazorpayCheckout] Initialize Turbo failed:', error);
      throw error;
    }
  }

  // Manage UPI accounts - equivalent to razorpay.upiTurbo.manageUpiAccount() in Swift
  static async manageUpiAccounts(mobileNumber, razorpayKey, color = '#3395ff') {
    try {
      await validateTurboAvailability();
      
      if (!mobileNumber || typeof mobileNumber !== 'string') {
        throw new Error('Valid mobile number is required');
      }
      
      if (!razorpayKey || typeof razorpayKey !== 'string') {
        throw new Error('Valid Razorpay key is required');
      }
      
      return await NativeModules.RNRazorpayCheckout.manageUpiAccounts(mobileNumber, color, razorpayKey);
    } catch (error) {
      console.error('[RazorpayCheckout] Manage UPI accounts failed:', error);
      throw error;
    }
  }

  // Enable session delegation - equivalent to TurboSessionDelegate in Swift
  static async setTurboSessionCallback() {
    try {
      await validateTurboAvailability();
      return await NativeModules.RNRazorpayCheckout.setTurboSessionCallback();
    } catch (error) {
      console.error('[RazorpayCheckout] Set Turbo session callback failed:', error);
      throw error;
    }
  }

  // Listen for session token requests - equivalent to TurboSessionDelegate.fetchToken in Swift
  static onTurboSessionTokenRequested(callback) {
    razorpayEvents.addListener('Razorpay::TURBO_SESSION_TOKEN_REQUESTED', (data) => {
      console.log('[RazorpayCheckout] Session token requested by native side');
      callback(data);
    });
  }

  // Provide session token back to native bridge - completes the token request flow
  static async provideSessionToken(token) {
    try {
      if (!token || typeof token !== 'string') {
        console.warn('[RazorpayCheckout] Invalid token provided, sending empty string');
        token = '';
      }
      
      console.log('[RazorpayCheckout] Providing session token to native bridge');
      return await NativeModules.RNRazorpayCheckout.provideSessionToken(token);
    } catch (error) {
      console.error('[RazorpayCheckout] Failed to provide session token:', error);
      throw error;
    }
  }

  // Helper method to remove all event listeners (cleanup)
  static removeAllListeners() {
    console.log('[RazorpayCheckout] Removing all event listeners');
    removeSubscriptions();
  }

  // Helper method to check if native module is available
  static isNativeModuleAvailable() {
    return !!(NativeModules.RNRazorpayCheckout && NativeModules.RazorpayEventEmitter);
  }
}

export default RazorpayCheckout;
