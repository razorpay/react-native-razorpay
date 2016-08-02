
# react-native-razorpay

## Dev setup

1. Use the examle project to test the module.
2. Run example/reload_module.sh every time you make a change to the module


## Getting started

`$ npm install react-native-razorpay --save`

### Mostly automatic installation

`$ react-native link react-native-razorpay`

### Manual installation


#### iOS

1. In XCode, in the project navigator, right click `Libraries` ➜ `Add Files to [your project's name]`
2. Go to `node_modules` ➜ `react-native-razorpay` and add `RNReactNativeRazorpay.xcodeproj`
3. In XCode, in the project navigator, select your project. Add `libRNReactNativeRazorpay.a` to your project's `Build Phases` ➜ `Link Binary With Libraries`
4. Run your project (`Cmd+R`)<

#### Android

1. Open up `android/app/src/main/java/[...]/MainApplication.java`
  - Add `import com.razorpay.rn.RazorpayPackage;` to the imports at the top of the file
  - Add `new RazorpayPackage()` to the list returned by the `getPackages()` method
2. Append the following lines to `android/settings.gradle`:
  	```
  	include ':react-native-razorpay'
  	project(':react-native-razorpay').projectDir = new File(rootProject.projectDir, 	'../node_modules/react-native-razorpay/android')
  	```
3. Insert the following lines inside the dependencies block in `android/app/build.gradle`:
  	```
      compile project(':react-native-razorpay')
  	```


### Usage

TODO

