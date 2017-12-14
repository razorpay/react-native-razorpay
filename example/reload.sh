#!/bin/sh
## Run this script after making changes to the module

react-native unlink react-native-razorpay
npm uninstall react-native-razorpay
npm install
react-native link react-native-razorpay
rm -r ./node_modules/react-native-razorpay/ios/Razorpay.framework
cp -R ../ios/Razorpay.framework ./node_modules/react-native-razorpay/ios/
rm -r ./ios/Razorpay.framework
cp -R ../ios/Razorpay.framework ./ios/
