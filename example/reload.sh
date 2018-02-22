#!/bin/sh
## Run this script after making changes to the module
react-native unlink react-native-razorpay
npm uninstall react-native-razorpay
npm install
react-native link react-native-razorpay
