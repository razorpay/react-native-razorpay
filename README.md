# react-native-razorpay
[![npm](https://img.shields.io/npm/l/express.svg)]()
[![NPM Version](http://img.shields.io/npm/v/react-native-razorpay.svg?style=flat)](https://www.npmjs.com/package/react-native-razorpay)
[![NPM Downloads](https://img.shields.io/npm/dm/react-native-razorpay.svg?style=flat)](https://npmcharts.com/compare/react-native-razorpay?minimal=true)
[![install size](https://packagephobia.com/badge?p=react-native-razorpay@2.1.35)](https://packagephobia.com/result?p=react-native-razorpay@2.1.35)

[![NPM](https://nodei.co/npm/react-native-razorpay.png?downloads=true)](https://nodei.co/npm/react-native-razorpay/)

React Native wrapper around our Android and iOS mobile SDKs


* [Prerequisites](#prerequisites)
* [Installation](#installation)
* [Requirements](#requirements)
* [Linking](#linking)
* [Usage](#usage)
* [Example App](https://github.com/razorpay/react-native-razorpay/tree/master/example/SampleProject)
* [Proguard Rules](#proguard-rules)
* [Notes](#things-to-be-taken-care)
* [FAQ's](#faqs)
* [Magic Checkout (Shopify)](#magic-checkout-shopify)
* [Contributing](#contributing)
* [License](#license)

The following documentation is only focussed on the react-native wrapper around our Android and iOS sdks. To know more about our react-native SDK, refer to the following documentation -

https://razorpay.com/docs/payment-gateway/react-native-integration/

To know more about Razorpay payment flow and steps involved, read up here:
<https://docs.razorpay.com/docs>

## Prerequisites

 - Learn about the <a href="https://razorpay.com/docs/payment-gateway/payment-flow/" target="_blank">Razorpay Payment Flow</a>.
 - Sign up for a <a href="https://dashboard.razorpay.com/#/access/signin">Razorpay Account</a> and generate the <a href="https://razorpay.com/docs/payment-gateway/dashboard-guide/settings/#api-keys/" target="_blank">API Keys</a> from the Razorpay Dashboard. Using the Test keys helps simulate a sandbox environment. No actual monetary transaction happens when using the Test keys. Use Live keys once you have thoroughly tested the application and are ready to go live.

## Installation

Using npm:

```shell
npm install --save react-native-razorpay
```

or using yarn:

```shell
yarn add react-native-razorpay
```

For Expo Users:
```shell
npx expo install react-native-razorpay
```

## Requirements

- iOS 10.0+ / macOS 10.12+ / tvOS 10.0+ / watchOS 3.0+
- Xcode 11+
- Swift 5.1+

## Linking

### Automatic

<details>
    <summary>iOS</summary>

### For React Native 0.60+

```sh
# install
npm install react-native-razorpay --save
cd ios && open podfile # Change the platform from iOS 9.0 to 10.0
pod install && cd .. # CocoaPods on iOS needs this extra step
# run
yarn react-native run-ios
```
### For React Native 0.59 and lower


1. `$ npm install react-native-razorpay --save` // Install the Razorpay React Native Standard SDK using the npm command.

2. `react-native link react-native-razorpay` // Link the SDK with React Native Project using Xcode.

3. Drag the `Razorpay.framework` file from the Libraries folder and drop it under the root folder, for more info follow [this link](https://razorpay.com/docs/payment-gateway/react-native-integration/standard/#step-2---link-the-sdk-with-react),
after this go to **Target** > **General Settings**> **Framework, Libraries and Embedded Content** section, set the **Embed** status of Razorpay.framework to **Embed & Sign**.

6. Also make sure the razorpay framework is added in the embedded binaries section and you have Always Embed Swift
   Standard Binaries set to yes in build settings.
</details>

### Manual

<details>
    <summary>iOS (via CocoaPods)</summary>

Add the following line to your build targets in your `Podfile`

`pod 'react-native-razorpay', :path => '../node_modules/react-native-razorpay'`

Then run `pod install`

</details>

<details>
    <summary>iOS (without CocoaPods)</summary>

In XCode, in the project navigator:

* Right click _Libraries_
* Add Files to _[your project's name]_
* Go to `node_modules/react-native-razorpay`
* Add the `.xcodeproj` file

In XCode, in the project navigator, select your project.

* Add the `libRNDeviceInfo.a` from the _deviceinfo_ project to your project's _Build Phases ➜ Link Binary With Libraries_
* Click `.xcodeproj` file you added before in the project navigator and go the _Build Settings_ tab. Make sure _All_ is toggled on (instead of _Basic_).
* Look for _Header Search Paths_ and make sure it contains both `$(SRCROOT)/../react-native/React` and `$(SRCROOT)/../../React`
* Mark both as recursive (should be OK by default).

Run your project (Cmd+R)

</details>

<details>
    <summary>Android </summary>


1. Open up `android/app/src/main/java/[...]/MainApplication.java`
  - Add `import com.razorpay.rn.RazorpayPackage;` to the imports at the top of
  the file
  - Add `new RazorpayPackage()` to the list returned by the `getPackages()` method
2. Append the following lines to `android/settings.gradle`:
    ```gradle
    include ':react-native-razorpay'
    project(':react-native-razorpay').projectDir = new File(rootProject.projectDir,   '../node_modules/react-native-razorpay/android')
    ```
3. Insert the following lines inside the dependencies block in
`android/app/build.gradle`:
    ```gradle
    implementation project(':react-native-razorpay')
    ```
</details>

### Note for Expo Applications:

After adding the react-native-razorpay package,the option to `prebuild` the app must be used(this generates the android/ios platform folders in the project to use native-modules). Command for which,
```shell
npx expo prebuild
```
After which the application will be installed on the device/emulator.
```shell
npx expo run:[ios|android] --device
```


## Usage

Sample code to integrate with Razorpay can be found in
[index.js][index.js] in the included example directory.

To run the example, simply do the following in example directory and then
link iOS SDK as explained in the previous section:

`$ npm i`

### Steps

1. Import RazorpayCheckout module to your component:
    ```js
    import RazorpayCheckout from 'react-native-razorpay';
    ```

2. Call `RazorpayCheckout.open` method with the payment `options`. The method
returns a **JS Promise** where `then` part corresponds to a successful payment
and the `catch` part corresponds to payment failure.
    ```js
    <TouchableHighlight onPress={() => {
      var options = {
        description: 'Credits towards consultation',
        image: 'https://i.imgur.com/3g7nmJC.png',
        currency: 'INR',
        key: '', // Your api key
        amount: '5000',
        name: 'foo',
        prefill: {
          email: 'void@razorpay.com',
          contact: '9191919191',
          name: 'Razorpay Software'
        },
        theme: {color: '#F37254'}
      }
      RazorpayCheckout.open(options).then((data) => {
        // handle success
        alert(`Success: ${data.razorpay_payment_id}`);
      }).catch((error) => {
        // handle failure
        alert(`Error: ${error.code} | ${error.description}`);
      });
    }}>
    ```

A descriptive [list of valid options for checkout][options] is available (under
Manual Checkout column).

## Proguard Rules
If you are using proguard for your builds, you need to add following lines to proguard files
```
-keepattributes *Annotation*
-dontwarn com.razorpay.**
-keep class com.razorpay.** {*;}
-optimizations !method/inlining/
-keepclasseswithmembers class * {
  public void onPayment*(...);
}
```

## Things to be taken care

- The react native plugin is wrapper around native SDK, so it doesn't work with the tools like expo which doesn't support native modules.

## FAQ's

- For UPI Intent in iOS, the info.plist in iOS should be modified to include `LSApplicationQueriesSchemes`
  - For Bare React-Native Apps:
    - info.plist can directly be modified from the xcode project. LSApplicationQueriesSchemes takes as array value and can currently include only ["tez","phonepe","paytmmp"]
  - For Expo Apps:
    - Directly modifying info.plist is discouraged, and hence this should be added in app.json
    ```shell
      "ios": {
        "infoPlist": {
          "LSApplicationQueriesSchemes": [
             "tez",
             "phonepe",
             "paytmmp"
          ]
        }
      }
      ```
    - P.S: The apps won't be visible if the application is run with metro builder. The info.plist is generated successfully and integrated only when the app is built as standalone app.  
- Still having trouble with integrating our payment gateway? Follow [this link](https://github.com/razorpay/react-native-razorpay/wiki/FAQ's) for more info.

## Magic Checkout (Shopify)

Magic Checkout (1CC) lets Shopify merchants offer a one-click checkout inside your React
Native app. It requires the merchant to be 1CC-enabled on Shopify server-side — there is no
SDK flag that turns it on from the app.

```js
import RazorpayCheckout from 'react-native-razorpay';

try {
  const result = await RazorpayCheckout.openMagicCheckout({
    key: 'rzp_live_xxxxxxxx',
    storefront_access_token: '<your Shopify Storefront access token>',
    cart_id: 'gid://shopify/Cart/c1-abcdef',
  });

  if (result.status === 'placed') {
    // The Shopify order exists. result.order_id and result.order_status_url are set.
  } else {
    // result.status === 'pending'. This is NOT a failure — see below.
  }
} catch (error) {
  // error.code is one of: MAGIC_ORDER_CREATE_FAILED, MAGIC_CHECKOUT_CANCELLED,
  // MAGIC_PAYMENT_FAILED, MAGIC_COMPLETE_FAILED, MAGIC_INVALID_OPTIONS.
  // Log error.code and error.reason for triage — see "Handling errors safely"
  // below before you touch error.details.
  console.log(error.code, error.reason);
}
```

### Parameters

| Parameter | Required | Notes |
|---|---|---|
| `key` | yes | Your Razorpay public `key_id` — the same one you already use for `RazorpayCheckout.open` |
| `storefront_access_token` | yes | **Your app's own** Shopify Storefront access token, not the merchant's. A Storefront cart is only readable by the app that created it, so the token has to be yours |
| `cart_id` | yes | The Storefront cart's **id** (e.g. `gid://shopify/Cart/c1-abcdef`) — an identifier, never the cart object itself. Passing a cart object is rejected; amounts and line items always stay server-side |

### Pending is not a failure

When `openMagicCheckout` resolves with `status: 'pending'`, Razorpay has already received
and accepted the payment — its backend worker is placing the Shopify order asynchronously,
retrying automatically (roughly at 5, 10 and 15 minutes) and refunding the payment if every
attempt fails. This is a **success path**, not an error.

Show the shopper something like "We're confirming your order" — never "Your order failed."
Telling a shopper their successful, paid order failed is a worse outcome than saying
nothing.

### Handling errors safely

Every rejection from `openMagicCheckout` carries three fields:

| Field | Contents |
|---|---|
| `error.code` | One of `MAGIC_ORDER_CREATE_FAILED`, `MAGIC_CHECKOUT_CANCELLED`, `MAGIC_PAYMENT_FAILED`, `MAGIC_COMPLETE_FAILED`, `MAGIC_INVALID_OPTIONS` |
| `error.reason` | A specific, queryable cause string (e.g. `user_cancelled`, `missing_cart_id`) |
| `error.details` | Diagnostic and recovery context — see below |

On a failure that happens **after the payment already succeeded** (order confirmation
failing to reach Razorpay), `error.details.handle` is populated with the exact payload
needed to retry order confirmation — including `razorpay_signature` and your `key`. This is
deliberate: it is the only way to recover a payment that was captured but never turned into
a Shopify order.

**Never blind-log `error.details` (or `error.details.handle`) to a crash reporter, analytics
tool, or any third-party logging service.** Doing so ships a live Razorpay payment signature
off-device. For monitoring and triage, log `error.code` and `error.reason` only. Persist
`error.details.handle` yourself, in your own secure storage, solely for the retry described
next.

### Recovering a payment whose order did not confirm

If your app is killed between the payment succeeding and Razorpay confirming the Shopify
order, `openMagicCheckout` may never resolve or reject — the promise is simply gone.
Everything needed to retry is already in the handle described above, so persist it as soon
as you have it and replay it later with a plain POST, no extra SDK call required:

```
POST https://api.razorpay.com/v1/1cc/shopify/complete?key_id=<key>
{
  "razorpay_order_id":   "...",
  "razorpay_payment_id": "...",
  "razorpay_signature":  "...",
  "key":                 "..."
}
```

Retrying is safe: Razorpay guarantees at most one Shopify order per Razorpay order within a
24-hour window, so replaying the same handle multiple times cannot create duplicate orders.

### Not supported in this release

Analytics fan-out (GA4, Facebook Pixel, MoEngage, CleverTap), coupon prefill UI,
abandoned-cart recovery, loyalty coins, gift cards, and WooCommerce or Magento storefronts.

## Contributing

See the [CONTRIBUTING] document. Thank you, [contributors]!

## License

react-native-razorpay is Copyright (c) 2020 Razorpay Software Pvt. Ltd.
It is distributed under [the MIT License][LICENSE].

We ♥ open source software!
See [our other supported plugins / SDKs][integrations]
or [contact us][contact] to help you with integrations.

[contact]: mailto:integrations@razorpay.com?subject=Help%20with%20React%20Native "Send us a mail"
[CONTRIBUTING]: CONTRIBUTING.md "Our contributing guidelines"
[contributors]: https://github.com/razorpay/react-native-razorpay/graphs/contributors "List of contributors"
[index.js]: example/SampleProject/index.js "index.js"
[integrations]: https://razorpay.com/integrations "List of our integrations"
[ios-docs]: https://docs.razorpay.com/v1/page/ios-integration "Documentation for the iOS Integration"
[LICENSE]: /LICENSE "MIT License"
[options]: https://docs.razorpay.com/docs/checkout-form#checkout-fields "Checkout Options"
[wiki]: https://github.com/razorpay/react-native-razorpay/wiki/Manual-Installation
