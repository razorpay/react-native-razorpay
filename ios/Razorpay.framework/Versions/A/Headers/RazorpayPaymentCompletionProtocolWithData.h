//
//  RazorpayPaymentCompletionProtocolWithData.h
//  Razorpay
//
//  Created by Akshay Bhalotia on 27/09/16.
//  Copyright © 2016 Razorpay. All rights reserved.
//

#import <Foundation/Foundation.h>

@protocol RazorpayPaymentCompletionProtocolWithData <NSObject>

- (void)onPaymentError:(int)code
           description:(nonnull NSString *)str
               andData:(nullable NSDictionary *)response;
- (void)onPaymentSuccess:(nonnull NSString *)payment_id
                 andData:(nullable NSDictionary *)response;

@end
