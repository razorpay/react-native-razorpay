//
//  RazorpayCheckout.m
//  RazorpayCheckout
//
//  Created by Akshay Bhalotia on 29/08/16.
//  Copyright © 2016 Razorpay. All rights reserved.
//

#import "RazorpayCheckout.h"
#import "RazorpayEventEmitter.h"

#import <Razorpay/Razorpay.h>
#import <Razorpay/RazorpayPaymentCompletionProtocol.h>

@interface RazorpayCheckout () <RazorpayPaymentCompletionProtocol>

@end

@implementation RazorpayCheckout

RCT_EXPORT_MODULE()

RCT_EXPORT_METHOD(open : (NSDictionary *)options) {

  NSString *keyID = (NSString *)[options objectForKey:@"key"];
  id razorpay =
      [NSClassFromString(@"Razorpay") initWithKey:keyID andDelegate:self];
  dispatch_sync(dispatch_get_main_queue(), ^{
    [razorpay open:options];
  });
}

- (void)onPaymentSuccess:(NSString *)payment_id {
  [RazorpayEventEmitter onPaymentSuccess:payment_id];
}

- (void)onPaymentError:(int)code description:(NSString *)str {
  [RazorpayEventEmitter onPaymentError:code description:str];
}

@end
