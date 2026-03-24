//
//  RazorpayEventEmitter.h
//  RazorpayCheckout
//
//  Created by Akshay Bhalotia on 19/09/16.
//  Copyright © 2016 Facebook. All rights reserved.
//

#import "React/RCTEventEmitter.h"

#ifdef RCT_NEW_ARCH_ENABLED
#import <RNRazorpayCheckoutSpec/RNRazorpayCheckoutSpec.h>

@interface RazorpayEventEmitter : RCTEventEmitter <NativeRazorpayEventEmitterSpec>
#else
@interface RazorpayEventEmitter : RCTEventEmitter
#endif

+ (void)onPaymentSuccess:(NSString *)payment_id
                 andData:(NSDictionary *)response;
+ (void)onPaymentError:(int)code
           description:(NSString *)str
               andData:(NSDictionary *)response;
+ (void)onExternalWalletSelected:(NSString *)walletName
                         andData:(NSDictionary *)paymentData;
@end
