//
//  RazorpayEventEmitter.h
//  RazorpayCheckout
//
//  Created by Akshay Bhalotia on 19/09/16.
//  Copyright © 2016 Facebook. All rights reserved.
//

#import "RCTEventEmitter.h"

@interface RazorpayEventEmitter : RCTEventEmitter

+ (void)onPaymentSuccess:(NSString *)payment_id;
+ (void)onPaymentError:(int)code description:(NSString *)str;

@end
