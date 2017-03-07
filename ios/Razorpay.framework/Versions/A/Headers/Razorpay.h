//
//  Razorpay.h
//  Razorpay
//
//  Created by Akshay Bhalotia on 02/03/16.
//  Copyright © 2016 Razorpay. All rights reserved.
//

#import "ExternalWalletSelectionProtocol.h"
#import "RazorpayPaymentCompletionProtocol.h"
#import "RazorpayPaymentCompletionProtocolWithData.h"
#import <Foundation/Foundation.h>
#import <UIKit/UIKit.h>

@interface Razorpay : NSObject

/*!
 @deprecated This method is deprecated. Use initWithKey:andDelegate: instead.
 See https://docs.razorpay.com/docs/ios for more information.
 */
+ (nonnull instancetype)
      initWithKey:(nonnull NSString *)key
      andDelegate:(nonnull id<RazorpayPaymentCompletionProtocol>)delegate
forViewController:(nullable UIViewController *)vc __attribute__((deprecated));
+ (nonnull instancetype)
initWithKey:(nonnull NSString *)key
andDelegate:(nonnull id<RazorpayPaymentCompletionProtocol>)delegate;
+ (nonnull instancetype)initWithKey:(nonnull NSString *)key
                andDelegateWithData:
                    (nonnull id<RazorpayPaymentCompletionProtocolWithData>)
                        delegate;
- (void)setExternalWalletSelectionDelegate:
    (nonnull id<ExternalWalletSelectionProtocol>)walletDelegate;
- (void)open:(nonnull NSDictionary *)options;
- (void)close;

@end
