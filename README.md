# react-native-razorpay

React Native wrapper around our Android and iOS mobile SDKs

## Installation

Run the following on terminal from your project directory:

`$ npm i react-native-razorpay --save`

### Automatic installation

`$ react-native link react-native-razorpay`

### Manual installation

If the above command doesn't work for you, try the following:

#### iOS

1. In XCode, in the project navigator, right click `Libraries` ➜
`Add Files to [your project's name]`
2. Go to `node_modules` ➜ `react-native-razorpay` and add `RazorpayCheckout.xcodeproj`
3. In XCode, in the project navigator, select your project. Add
`libRazorpayCheckout.a` to your project's `Build Phases` ➜ `Link Binary With Libraries`
4. Run your project (`⌘+R`)

#### Android

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
compile project(':react-native-razorpay')
```

## Linking iOS SDK

React Native creates static library for each plugin / library / framework / native module being used.

Due to some limitation on the way Xcode links static and dynamic 
libraries / frameworks to projects, we require some additional
steps to be followed to link our iOS SDK to the React Native project.

1. Download [Razorpay's iOS SDK from here][ios-docs] and unzip it.
2. Delete the `.framework` file from
`path/to/your/project/node_modules/react-native-razorpay`.
3. Copy the `.framework` file obtained in step 1 to
`path/to/your/project/node_modules/react-native-razorpay`.
4. Open `path/to/your/project/ios/<your_project>.xcworkspace` or
`path/to/your/project/ios/<your_project>.xcodeproj`
5. Also link the `.framework` file **_directly_ to your project** in Xcode. Check the
 `Copy items if needed` box and select your project target from the list below.
6. Add the following line of code in your `AppDelegate.m` under the imports section:  
`#import <dlfcn.h>`
7. Add the following line of code in your `AppDelegate.m` inside the
`application:didFinishLaunchingWithOptions:` method:  
`dlopen("Razorpay.framework/Razorpay", RTLD_LAZY | RTLD_GLOBAL);`

## Usage

Sample code to integrate with Razorpay can be found in 
[index.js][index.js] in the included example directory.

To run the example, simply do the following in example directory and then
link iOS SDK as explained in the previous section:

`$ npm i`

## Contributing

See the [CONTRIBUTING] document. Thank you, [contributors]!

## License

react-native-razorpay is Copyright (c) 2016 Razorpay Software Pvt. Ltd.
It is distributed under [the MIT License][LICENSE].

We love open source software!
See [our other supported plugins / SDKs][integrations]
or [contact us][contact] to help you with integrations.

[integrations]: https://razorpay.com/integrations "List of our integrations"
[contact]: mailto:integrations@razorpay.com?subject=Help%20with%20React%20Native "Send us a mail"
[CONTRIBUTING]: CONTRIBUTING.md "Our contributings guidelines"
[contributors]: https://github.com/razorpay/react-native-razorpay/graphs/contributors "List of contributors"
[LICENSE]: /LICENSE "MIT License"
[index.js]: example/index.js "index.js"
[ios-docs]: https://docs.razorpay.com/v1/page/ios-integration "Documentation for the iOS Integration"