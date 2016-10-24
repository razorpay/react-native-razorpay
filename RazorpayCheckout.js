'use strict';

import { NativeModules, NativeEventEmitter } from 'react-native';

export const Razorpay = {
  RazorpayCheckout: NativeModules.RazorpayCheckout,
  RazorpayEventEmitter: NativeModules.RazorpayEventEmitter
};
