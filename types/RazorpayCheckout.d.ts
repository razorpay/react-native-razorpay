export default RazorpayCheckout;
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

declare class RazorpayCheckout {
  static open(options: Options, successCallback: any, errorCallback: any): any;
  static onExternalWalletSelection(externalWalletCallback: any): void;
}
