export interface RazorpayOptions {
    key: string;
    amount: string | number;
    currency?: string;
    name?: string;
    description?: string;
    image?: string;
    prefill?: {
      name?: string;
      email?: string;
      contact?: string;
    };
    theme?: {
      color?: string;
    };
    external?: {
      wallets?: string[];
    };
    [key: string]: any;
  }
  
  export interface PaymentSuccessResponse {
    razorpay_payment_id: string;
    razorpay_order_id?: string;
    razorpay_signature?: string;
    [key: string]: any;
  }
  
  export interface PaymentErrorResponse {
    code: number;
    description: string;
    [key: string]: any;
  }
  
  declare class RazorpayCheckout {
    static open(
      options: RazorpayOptions,
      successCallback?: (data: PaymentSuccessResponse) => void,
      errorCallback?: (data: PaymentErrorResponse) => void
    ): Promise<PaymentSuccessResponse>;
    
    static onExternalWalletSelection(
      externalWalletCallback: (data: any) => void
    ): void;
  }
  
  export default RazorpayCheckout;