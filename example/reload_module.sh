#!/bin/sh
## Run this script after making changes to the module
npm uninstall react-native-razorpay
npm install
react-native link
