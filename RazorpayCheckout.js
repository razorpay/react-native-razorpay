'use strict';

import { NativeModules, NativeEventEmitter, Linking } from 'react-native';


const razorpayEvents = new NativeEventEmitter(NativeModules.RazorpayEventEmitter);

const removeSubscriptions = () => {
  razorpayEvents.removeAllListeners('Razorpay::PAYMENT_SUCCESS');
  razorpayEvents.removeAllListeners('Razorpay::PAYMENT_ERROR');
  razorpayEvents.removeAllListeners('Razorpay::EXTERNAL_WALLET_SELECTED');
};

class RazorpayCheckout {

  appShortCodesWhichSupportUpi = [];
  
  static setAppShortCodesWhichSupportUpi(appShortCodesWhichSupportUpi){
    this.appShortCodesWhichSupportUpi = appShortCodesWhichSupportUpi;
  }

  static getAppShortCodesWhichSupportUpi(){
    return this.appShortCodesWhichSupportUpi;
  }

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
  static onExternalWalletSelection(externalWalletCallback) {
    razorpayEvents.addListener('Razorpay::EXTERNAL_WALLET_SELECTED', (data) => {
      externalWalletCallback(data);
      removeSubscriptions();
    });
  }

  static async getAppsWhichSupportUpi(){
    const appsListToVerifyAgainst = {
      "gpay":"gpay://upi/pay",
      "phonepe":"phonepe://pay",
      "credpay":"credpay://upi/pay",
      "paytm":"paytmmp://upi/pay",
      "bhim":"bhim://upi/pay",
      "postpe":"postpe://upi/pay"
    }
    const appShortCodesWhichSupportUpi = [];
    for (const appShortCode in appsListToVerifyAgainst) {
      const canOpen = await Linking.canOpenURL(appsListToVerifyAgainst[appShortCode]);
      if (canOpen) {
        appShortCodesWhichSupportUpi.push(appShortCode);
      }
    }
    return appShortCodesWhichSupportUpi;
  }

  static injectJavascriptIntoWebview(){
    const script = `
     (function() {
      alert("Hello from injectJavascriptIntoWebview");
      alert(${this.getAppShortCodesWhichSupportUpi()});
     })();
    `;
    NativeModules.RNRazorpayCheckout.injectJavascriptIntoWebview(script);

  }

}

export default RazorpayCheckout;
