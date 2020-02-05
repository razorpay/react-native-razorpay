# react-native-razorpay
[![npm](https://img.shields.io/npm/l/express.svg)]()

[![NPM](https://nodei.co/npm/react-native-razorpay.png?downloads=true)](https://nodei.co/npm/react-native-razorpay/)

React Native wrapper around our Android and iOS mobile SDKs

* [Installation](#installation)
* [Linking](#linking)
* [Usage](#usage)
* [API](#api)
* [Troubleshooting](#troubleshooting)
* [Release Notes](#release-notes)
* [react-native-dom / react-native-web](#react-native-dom)

The following documentation is only focussed on the react-native wrapper around our Android and iOS sdks. To know more about our react-native SDK, refer to the following documentation - 

https://razorpay.com/docs/payment-gateway/react-native-integration/

To know more about Razorpay payment flow and steps involved, read up here:
<https://docs.razorpay.com/docs>

## Installation

Using npm:

```shell
npm install --save react-native-razorpay
```

or using yarn:

```shell
yarn add react-native-razorpay
```
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
        key: 'rzp_test_1DP5mmOlF5G5ag',
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

## Proguard rules
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

## Things to be taken care:

- The react native plugin is wrapper around native SDK, so it doesn't work with the tools like expo which doesn't support native modules.

## Contributing

See the [CONTRIBUTING] document. Thank you, [contributors]!

## License

react-native-razorpay is Copyright (c) 2016 Razorpay Software Pvt. Ltd.
It is distributed under [the MIT License][LICENSE].

We ♥ open source software!
See [our other supported plugins / SDKs][integrations]
or [contact us][contact] to help you with integrations.

[contact]: mailto:integrations@razorpay.com?subject=Help%20with%20React%20Native "Send us a mail"
[CONTRIBUTING]: SupportingFiles/CONTRIBUTING.md "Our contributings guidelines"
[contributors]: https://github.com/razorpay/react-native-razorpay/graphs/contributors "List of contributors"
[index.js]: example/index.js "index.js"
[integrations]: https://razorpay.com/integrations "List of our integrations"
[ios-docs]: https://docs.razorpay.com/v1/page/ios-integration "Documentation for the iOS Integration"
[LICENSE]: /LICENSE "MIT License"
[options]: https://docs.razorpay.com/docs/checkout-form#checkout-fields "Checkout Options"
[wiki]: https://github.com/razorpay/react-native-razorpay/wiki/Manual-Installation
