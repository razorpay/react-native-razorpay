#!/bin/sh
## Run this script after installing the module


curl -O https://rzp-mobile.s3.amazonaws.com/ios/checkout/1.0.6/RazorpayX9.framework.zip
unzip -o ./RazorpayX9.framework.zip
rm -r ./ios/Razorpay.framework
cp -r ./Razorpay.framework ./ios/
rm -r Razorpay.framework
rm RazorpayX9.framework.zip
