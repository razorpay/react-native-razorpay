# react-native-razorpay
[![npm](https://img.shields.io/npm/l/express.svg)]()

[![NPM](https://nodei.co/npm/react-native-razorpay.png?downloads=true)](https://nodei.co/npm/react-native-razorpay/)

React Native wrapper around our Android and iOS mobile SDKs

**Note**: This release contains a module map embedded in the framework which by default considers that your Xcode is named Xcode.app.If your Xcode is named differently please copy the script added in the /node_modules/react-native-razorpay/scripts/ , paste it  and run it in the folder containing the razorpay framework.

For eg:

if the path of the razorpay framework is 

/node_modules/react-native-razorpay/ios/Razorpay.framework

paste the script in /node_modules/react-native-razorpay/ios

and run the scipt , it will perform the required changes to the module map in the framework , you can then copy it and use it like before.


**Note**: This release is meant for Xcode 9.3 as it uses a framework compiled in Swift 4.1.This will not work in Xcode 9.2 as you will get a "dlyd error : framework not found error".In case you are using an older version of Xcode and need Swift 3.1 visit the following link and download the respective framework.

**Note**: The iOS framework is shipped with simulator architectures , you have to remove them before you archive, just google  stripping simulator architectures and follow the steps.Also remember to enable bitcode on both your iOS project as well as the RazorpayCheckout project.

https://razorpay.com/docs/ios

After this replace the framework in  /node_modules/react-native-razorpay/ios/ 
and link your project either using react-native commands or manually.

The following documentation is only focussed on the react-native wrapper around our Android and iOS sdks. To know more about our sdks and how to link them within the projects, refer to the following documentation-

**Android** - https://docs.razorpay.com/v1/page/android/

**iOS** - https://razorpay.com/docs/ios/

To know more about Razorpay payment flow and steps involved, read up here:
<https://docs.razorpay.com/docs>




## Installation

This has 3 steps: add to project, installation and linking iOS SDK.

### Add to project

Run the following on terminal from your project directory:

**Note**: For Windows users, run this on Git Bash instead of Command Prompt. You can download Git for Windows [here](https://github.com/git-for-windows/git/releases/latest).

```bash
$ npm i react-native-razorpay --save
```

### Automatic installation

```bash
$ react-native link react-native-razorpay
```

##### Manual installation

If the above command doesn't work for you (installation), try [these steps from wiki][wiki].

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
[CONTRIBUTING]: CONTRIBUTING.md "Our contributings guidelines"
[contributors]: https://github.com/razorpay/react-native-razorpay/graphs/contributors "List of contributors"
[index.js]: example/index.js "index.js"
[integrations]: https://razorpay.com/integrations "List of our integrations"
[ios-docs]: https://docs.razorpay.com/v1/page/ios-integration "Documentation for the iOS Integration"
[LICENSE]: /LICENSE "MIT License"
[options]: https://docs.razorpay.com/docs/checkout-form#checkout-fields "Checkout Options"
[wiki]: https://github.com/razorpay/react-native-razorpay/wiki/Manual-Installation
