export type RazorpayOptions = {
  key: string;
  amount: number | string;
  currency?: string;
  name?: string;
  description?: string;
  image?: string;
  order_id?: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: {
    [key: string]: string;
  };
  theme?: {
    color?: string;
    hide_topbar?: boolean;
  };
  modal?: {
    backdropclose?: boolean;
    escape?: boolean;
    handleback?: boolean;
    confirm_close?: boolean;
    ondismiss?: () => void;
    animation?: boolean;
  };
  subscription_id?: string;
  subscription_card_change?: boolean;
  recurring?: boolean | string;
  callback_url?: string;
  redirect?: boolean;
  customer_id?: string;
  remember_customer?: boolean;
  timeout?: number;
  readonly?: {
    email?: boolean;
    contact?: boolean;
    name?: boolean;
  };
  hidden?: {
    email?: boolean;
    contact?: boolean;
  };
  [key: string]: any;
};

export type PaymentSuccessData = {
  razorpay_payment_id: string;
  razorpay_order_id?: string;
  razorpay_signature?: string;
  [key: string]: any;
};

export type PaymentErrorData = {
  code: number;
  description: string;
  source: string;
  step: string;
  reason: string;
  metadata: {
    order_id?: string;
    payment_id?: string;
    [key: string]: any;
  };
};

export type ExternalWalletData = {
  external_wallet: string;
  [key: string]: any;
};

export type MagicCheckoutOptions = {
  /** Razorpay public key_id. Authenticates the init call and identifies the merchant. */
  key: string;
  /** The app's Shopify Storefront access token. Only the app that created a cart can read it. */
  storefront_access_token: string;
  /** Storefront cart id, e.g. "gid://shopify/Cart/c1-abc". An identifier — never a cart object. */
  cart_id: string;
};

export type MagicCheckoutResult = {
  /** Shopify order id. Undefined while status is 'pending'. */
  order_id?: string;
  order_status_url?: string;
  total_amount?: number;
  payment_id: string;
  /** 'placed' — Shopify order exists. 'pending' — accepted, being placed asynchronously. */
  status: 'placed' | 'pending';
};

export type MagicHandle = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  key: string;
};
