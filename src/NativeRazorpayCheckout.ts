/**
 * TurboModule interface for Razorpay checkout
 * This file defines the native module interface for code generation
 */

import { TurboModule, TurboModuleRegistry } from 'react-native';

export interface NativeRazorpayCheckout extends TurboModule {
  /**
   * Opens the Razorpay checkout modal
   * @param options Checkout configuration options
   * @returns Promise that resolves with payment details on success
   */
  open(options: object): Promise<any>;
}

export default TurboModuleRegistry.getEnforcing<NativeRazorpayCheckout>(
  'RNRazorpayCheckout',
);
