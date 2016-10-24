#!/bin/sh
## Run this script after making changes to the module

npm uninstall react-native-razorpay
npm install
react-native link
rm -r ./node_modules/react-native-razorpay/ios/Razorpay.framework
cp -R ./../Razorpay.framework ./node_modules/react-native-razorpay/ios/
