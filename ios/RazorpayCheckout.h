//
//  RazorpayCheckout.h
//  RazorpayCheckout
//
//  Created by Akshay Bhalotia on 31/08/16.
//  Copyright © 2016 Razorpay. All rights reserved.
//

#import <React/RCTBridgeModule.h>

#ifdef RCT_NEW_ARCH_ENABLED
#import <RNRazorpayCheckoutSpec/RNRazorpayCheckoutSpec.h>

@interface RNRazorpayCheckout : NSObject <RCTBridgeModule, NativeRazorpayCheckoutSpec>
#else
@interface RNRazorpayCheckout : NSObject <RCTBridgeModule>
#endif

@end
