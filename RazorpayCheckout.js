'use strict';

import { NativeModules, NativeEventEmitter } from 'react-native';

const razorpayEvents = new NativeEventEmitter(NativeModules.RazorpayEventEmitter);

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
      NativeModules.RNRazorpayCheckout.open(options);
    });
  }

  // Dynamic import and initialization for Shopify Checkout
  static async initializeShopifyCheckout() {
    if (!this.isShopifyInitialized) {
      try {
        // Dynamic import of Shopify Checkout Sheet Kit
        this.shopifyModule = await import('@shopify/checkout-sheet-kit');
        this.shopifyCheckoutInstance = new this.shopifyModule.ShopifyCheckoutSheet();
        this.isShopifyInitialized = true;
        console.log('Shopify Checkout Sheet Kit dynamically loaded');
        return true;
      } catch (error) {
        console.error('Failed to dynamically load Shopify Checkout Sheet Kit:', error);
        return false;
      }
    }
    return true;
  }

  // Setup event listeners for Shopify Checkout
  static async setupShopifyEventListeners() {
    const initialized = await this.initializeShopifyCheckout();
    if (!initialized || !this.shopifyCheckoutInstance) {
      console.error('Shopify Checkout not initialized');
      return null;
    }
    console.log("Shopify Checkout initialized and available")
    // Clear existing listeners
    // this.clearShopifyEventListeners();

    try {
      const close = this.shopifyCheckoutInstance.addEventListener('close', () => {
        console.log("Shopify Checkout Sheet Kit closed");
        // Emit custom Razorpay event if needed
        // razorpayEvents.emit('Razorpay::SHOPIFY_CHECKOUT_CLOSED', {});
        NativeModules.RNRazorpayCheckout.shopifyCheckoutClosed();
      });

      const completed = this.shopifyCheckoutInstance.addEventListener('completed', (event) => {
        const orderId = event.orderDetails?.id;
        console.log("Shopify Order ID:", orderId);
        // Emit custom Razorpay event
        // razorpayEvents.emit('Razorpay::SHOPIFY_CHECKOUT_COMPLETED', {
        //   orderId,
        //   orderDetails: event.orderDetails
        // });
        NativeModules.RNRazorpayCheckout.shopifyCheckoutCompleted();
      });

      const error = this.shopifyCheckoutInstance.addEventListener('error', (error) => {
        console.log("Shopify Checkout Error:", error.message);
        // Emit custom Razorpay event
        
      });

      const pixel = this.shopifyCheckoutInstance.addEventListener('pixel', (event) => {
        console.log("Shopify Pixel Event:", event);
        if(event['name'] === 'checkout_started'){
          NativeModules.RNRazorpayCheckout.shopifyCheckoutStarted()
       }
        // Emit custom Razorpay event
        // razorpayEvents.emit('Razorpay::SHOPIFY_PIXEL_EVENT', event);
      });

      // Store listeners for cleanup
      this.shopifyListeners = [close, completed, error, pixel];

      return {
        close,
        completed,
        error,
        pixel
      };
    } catch (error) {
      console.error('Failed to setup Shopify event listeners:', error);
      return null;
    }
  }

   // Clear Shopify event listeners
   static clearShopifyEventListeners() {
    this.shopifyListeners.forEach(listener => {
      if (listener && listener.remove) {
        listener.remove();
      }
    });
    this.shopifyListeners = [];
  }

  // Register for Shopify Checkout events
  static async registerForCheckoutSheetKitEvent() {
    console.log("Registering for Shopify Checkout Sheet Kit events");
    return await this.setupShopifyEventListeners();
  }

  static callNativeIntentUrl(intentUrl){
    NativeModules.RNRazorpayCheckout.callNativeIntentUrl(intentUrl);
  }

  static onExternalWalletSelection(externalWalletCallback) {
    razorpayEvents.addListener('Razorpay::EXTERNAL_WALLET_SELECTED', (data) => {
      externalWalletCallback(data);
      removeSubscriptions();
    });
  }
}

export default RazorpayCheckout;
