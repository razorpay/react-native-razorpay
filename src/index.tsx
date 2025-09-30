import { Platform, NativeEventEmitter, NativeModules } from 'react-native';
import NativeRazorpay from './NativeRazorpay';

const RazorpayEvents = new NativeEventEmitter(
  Platform.OS === 'ios' ? NativeModules.RazorpayEventEmitter : NativeModules.Razorpay
);


class RazorpayCheckout {


  static open(options: Object, successCallback?: Function, errorCallback?: Function): Promise<any> {
    return new Promise((resolve, reject) => {
      // Clean up existing subscriptions
      this.removeSubscriptions();

      // Add success listener
      RazorpayEvents.addListener('Razorpay::PAYMENT_SUCCESS', (data) => {
        const resolveFn = successCallback || resolve;
        resolveFn(data);
        this.removeSubscriptions();
      });

      // Add error listener
      RazorpayEvents.addListener('Razorpay::PAYMENT_ERROR', (data) => {
        const rejectFn = errorCallback || reject;
        rejectFn(data);
        this.removeSubscriptions();
      });

      // Call native method
      NativeRazorpay.open(options);
    });
  }

  static onExternalWalletSelection(externalWalletCallback: Function): void {
    this.removeSubscriptions();

    RazorpayEvents.addListener('Razorpay::EXTERNAL_WALLET_SELECTED', (data) => {
      externalWalletCallback(data);
      this.removeSubscriptions();
    });
  }

  static multiply(a: number, b: number): number {
    return NativeRazorpay.multiply(a, b);
  }

  private static removeSubscriptions(): void {
    RazorpayEvents.removeAllListeners('Razorpay::PAYMENT_SUCCESS');
    RazorpayEvents.removeAllListeners('Razorpay::PAYMENT_ERROR');
    RazorpayEvents.removeAllListeners('Razorpay::EXTERNAL_WALLET_SELECTED');
  }
}

export default RazorpayCheckout;