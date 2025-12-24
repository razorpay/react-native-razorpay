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
    try{
      NativeModules.RNRazorpayCheckout.testMethodForInvocation("getAppsWhichSupportUpi");
    }catch(error){
      //no-op
    }
    
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

  // Dynamically load Shopify Checkout Sheet Kit and keep a singleton instance
  static async initializeShopifyCheckout() {
    if (this.shopifyCheckoutInstance) {
      return true;
    }
    try {
      const shopifyModule = await import('@shopify/checkout-sheet-kit');
      this.shopifyModule = shopifyModule;
      this.shopifyCheckoutInstance = new shopifyModule.ShopifyCheckoutSheet();
      this.shopifyListeners = [];
      return true;
    } catch (error) {
      console.warn('Shopify Checkout Sheet Kit not available:', error);
      return false;
    }
  }

  // Register listeners so we know when the Checkout Sheet Kit flow starts
  static async setupShopifyEventListeners() {
    const initialized = await this.initializeShopifyCheckout();
    if (!initialized || !this.shopifyCheckoutInstance) {
      return null;
    }

    // Clear any stale listeners before wiring new ones
    this.clearShopifyEventListeners();

    try {
      const close = this.shopifyCheckoutInstance.addEventListener('close', () => {
        console.log('Shopify Checkout Sheet Kit closed');
      });

      const completed = this.shopifyCheckoutInstance.addEventListener('completed', (event) => {
        console.log('Shopify Checkout completed', event?.orderDetails?.id);
      });

      const error = this.shopifyCheckoutInstance.addEventListener('error', (evt) => {
        console.log('Shopify Checkout error', evt?.message);
      });

      // Shopify emits a pixel event when checkout begins; trigger our injection there
      const pixel = this.shopifyCheckoutInstance.addEventListener('pixel', async (event) => {
        console.log('Shopify pixel event', event);
        if (event && event.name === 'checkout_started') {
          try {
            await this.injectJavascriptIntoWebview(true);
          } catch (e) {
            console.warn('Failed to inject script for Checkout Sheet Kit', e);
          }
        }
      });

      this.shopifyListeners = [close, completed, error, pixel].filter(Boolean);

      return {
        close,
        completed,
        error,
        pixel
      };
    } catch (err) {
      console.error('Failed to setup Shopify Checkout Sheet Kit listeners', err);
      return null;
    }
  }

  // Remove any Shopify listeners we registered
  static clearShopifyEventListeners() {
    if (!this.shopifyListeners || this.shopifyListeners.length === 0) {
      return;
    }
    this.shopifyListeners.forEach(listener => {
      if (listener && typeof listener.remove === 'function') {
        listener.remove();
      }
    });
    this.shopifyListeners = [];
  }

  // Public helper to start listening for Checkout Sheet Kit events
  static async registerForCheckoutSheetKitEvent() {
    console.log('Registering for Shopify Checkout Sheet Kit events');
    return await this.setupShopifyEventListeners();
  }

}

export default RazorpayCheckout;
