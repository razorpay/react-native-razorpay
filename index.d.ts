import * as React from "react";
import * as ReactNative from "react-native";

declare module "react-native-razorpay" {

  // REF: https://docs.razorpay.com/docs/checkout-form#checkout-fields
  export interface CheckoutOptions {
    key: string;
    amount: number;
    currency?: string;
    name: string;
    description?: string;
    image?: string;
    prefill?: {
      name?: string;
      email?: string;
      contact?: string | number;
      method?: undefined | "card" | "netbanking" | "wallet" | "emi" | "upi"
    }
    note?: {
      [key: string]: string | number;
    }
    theme?: {
      color?: string;
    }
    order_id?: string;
    invoice_id?: string;
  }

  export interface PaymentSuccess {
    razorpay_payment_id: string;
  }

  export interface PaymentFailure {
    code: number;
    description: string;
  }

  export default class RazorpayCheckout {
    static open(
      options: CheckoutOptions,
      onSuccess: (data: PaymentSuccess) => void,
      onFailure: (error: PaymentFailure) => void
    ): void

    static open(options: CheckoutOptions): Promise<PaymentSuccess>

    static onExternalWalletSelection(onSelection: Function);
  }
}
