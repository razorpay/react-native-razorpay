"use strict";

import { NativeModules, NativeEventEmitter } from "react-native";

const razorpayEvents = new NativeEventEmitter(
  NativeModules.RazorpayEventEmitter
);

const removeSubscriptions = () => {
  razorpayEvents.removeAllListeners("Razorpay::PAYMENT_SUCCESS");
  razorpayEvents.removeAllListeners("Razorpay::PAYMENT_ERROR");
  razorpayEvents.removeAllListeners("Razorpay::EXTERNAL_WALLET_SELECTED");
};

interface Wallet {
  wallets: string[];
}

interface Prefill {
  email: string;
  contact: string;
  name: string;
}

interface Theme {
  color: string;
}

interface Options {
  description: String;
  image?: String;
  currency: String;
  key: String;
  amount: String;
  external: Wallet;
  name?: String;
  prefill: Prefill;
  theme: Theme;
}

class RazorpayCheckout {
  static open(options: Options, successCallback: any, errorCallback: any) {
    return new Promise(function (resolve, reject) {
      razorpayEvents.addListener("Razorpay::PAYMENT_SUCCESS", (data) => {
        let resolveFn = successCallback || resolve;
        resolveFn(data);
        removeSubscriptions();
      });
      razorpayEvents.addListener("Razorpay::PAYMENT_ERROR", (data) => {
        let rejectFn = errorCallback || reject;
        rejectFn(data);
        removeSubscriptions();
      });
      NativeModules.RNRazorpayCheckout.open(options);
    });
  }
  static onExternalWalletSelection(externalWalletCallback) {
    razorpayEvents.addListener("Razorpay::EXTERNAL_WALLET_SELECTED", (data) => {
      externalWalletCallback(data);
      removeSubscriptions();
    });
  }
}

export default RazorpayCheckout;
