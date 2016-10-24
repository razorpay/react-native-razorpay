#!/bin/sh
## Run this script after installing the module

curl -O http://downloads.razorpay.com/Razorpay.framework-0.14.1.zip
unzip ./Razorpay.framework-0.14.1.zip
rm -r ./ios/Razorpay.framework
cp -R ./Razorpay.framework ./ios/
