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
    NativeModules.RNRazorpayCheckout.testMethodForInvocation("getAppsWhichSupportUpi");
    console.log("getAppsWhichSupportUpi");
    const appsListToVerifyAgainst = {
      "google_pay":"gpay://upi/pay",
      "tez":"tez://upi/pay",
      "phonepe":"phonepe://pay",
      "cred":"credpay://upi/pay",
      "paytm":"paytmmp://upi/pay",
      "bhim":"bhim://upi/pay",
      "postpe":"postpe://upi/pay"
    }
    const appShortCodesWhichSupportUpi = [];
    for (const appShortCode in appsListToVerifyAgainst) {
      console.log("appShortCode", appShortCode);
      const canOpen = await Linking.canOpenURL(appsListToVerifyAgainst[appShortCode]);
      console.log("canOpen", canOpen);
      if (canOpen) {
        appShortCodesWhichSupportUpi.push(appShortCode);
      }
    }
    console.log("appShortCodesWhichSupportUpi", appShortCodesWhichSupportUpi);
    return appShortCodesWhichSupportUpi;
  }

  static async injectJavascriptIntoWebview(isCheckoutSheetKit = false){
    console.log("injectJavascriptIntoWebview");
    // Ensure the native call is still made even if canOpenURL rejects for
    // unlisted schemes (iOS needs LSApplicationQueriesSchemes whitelisted).
    const appShortCodes = await this.getAppsWhichSupportUpi().catch(err => {
      console.warn('getAppsWhichSupportUpi failed; continuing without list', err);
      return [];
    });
    // Inject a script that augments window.options before the page's onload runs.
    // const script = `
    //  (function() {
    //     alert(${JSON.stringify(appShortCodes)});
    //     if (typeof window === 'undefined') {
    //       return;
    //     }

    //     console.log('getWebViewOnScreen');

    //     var forcedKey = 'rzp_live_ILgsfZCZoFIKMb';
    //     var intentApps = ${JSON.stringify(appShortCodes)};

    //     function applyOptions() {
    //       var options = window.options || {};

    //       options.key = forcedKey;
    //       if (options.order_id) {
    //         delete options.order_id;
    //       }

    //       options.method = options.method || {};
    //       options.method.upi = options.method.upi || {};
    //       options.method.upi.intent = options.method.upi.intent || { apps: [] };
    //       options.method.upi.intent.apps = intentApps;

    //       // options.webview_intent = true;
    //       window.options = options;

    //       if (typeof window.Razorpay === 'function') {
    //         try {
    //           window.razorpay = window.Razorpay(window.options);
    //           console.log('razorpay: ', window.Razorpay);
    //         } catch (e) {
    //           console.log('error: ', e);
    //         }
    //       }
    //     }

    //     var originalOnload = window.onload;

    //     window.addEventListener(
    //       'load',
    //       function(evt) {
    //         alert('onload hijacked with options: ' + JSON.stringify(window.razorpay));

    //         applyOptions();

    //         if (typeof originalOnload === 'function') {
    //           try {
    //             originalOnload.call(window, evt);
    //           } catch (e) {}
    //         }

    //         if (typeof window.showCheckout === 'function') {
    //           try {
    //             window.showCheckout();
    //           } catch (e) {}
    //         }
    //       },
    //       true
    //     );
    //   })();
    // `;
    const script = `
      (function() {
        console.log("injecting apps again");
        if (typeof window === 'undefined') {
          return;
        }
        if (window.__rzp_upi_intent_patched) {
          return;
        }
        window.__rzp_upi_intent_patched = true;
        console.log("injecting apps again after patch");

        window.Razorpay = window.Razorpay || {};
        window.Razorpay.method = {
          upi: {
            intent: {
              apps: ${JSON.stringify(appShortCodes)}
            }
          }
        }
      })();
    `;
    NativeModules.RNRazorpayCheckout.injectJavascriptIntoWebView(script, isCheckoutSheetKit);

  }

}

export default RazorpayCheckout;
