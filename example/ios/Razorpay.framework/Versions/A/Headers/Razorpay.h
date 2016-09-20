//
//  Razorpay.h
//  Razorpay
//
//  Created by Akshay Bhalotia on 02/03/16.
//  Copyright © 2016 Razorpay. All rights reserved.
//

#import "RazorpayPaymentCompletionProtocol.h"
#import <Foundation/Foundation.h>
#import <UIKit/UIKit.h>

@interface Razorpay : NSObject

+ (nonnull instancetype)
      initWithKey:(nonnull NSString *)key
      andDelegate:(nonnull id<RazorpayPaymentCompletionProtocol>)delegate
forViewController:(nullable UIViewController *)vc;
+ (nonnull instancetype)
initWithKey:(nonnull NSString *)key
andDelegate:(nonnull id<RazorpayPaymentCompletionProtocol>)delegate;
- (void)open:(nonnull NSDictionary *)options;
- (void)close;

@end
