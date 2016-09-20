'use strict';

import { NativeModules, NativeEventEmitter } from 'react-native';

export const RZP = {
  RazorpayCheckout: NativeModules.RazorpayCheckout,
  RazorpayEventEmitter: NativeModules.RazorpayEventEmitter
};
