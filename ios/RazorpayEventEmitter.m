//
//  RazorpayEventEmitter.m
//  RazorpayCheckout
//
//  Created by Akshay Bhalotia on 19/09/16.
//  Copyright © 2016 Facebook. All rights reserved.
//

#import "RazorpayEventEmitter.h"

#import "RCTBridge.h"
#import "RCTEventDispatcher.h"

NSString *const kPaymentError = @"PAYMENT_ERROR";
NSString *const kPaymentSuccess = @"PAYMENT_SUCCESS";
NSString *const kExternalWalletSelected = @"EXTERNAL_WALLET_SELECTED";

@implementation RazorpayEventEmitter

RCT_EXPORT_MODULE();

- (NSArray<NSString *> *)supportedEvents {
    return @[
     @"Razorpay::PAYMENT_SUCCESS",
     @"Razorpay::PAYMENT_ERROR",
     @"Razorpay::EXTERNAL_WALLET_SELECTED"
    ];
}

- (void)startObserving {
    [[NSNotificationCenter defaultCenter] addObserver:self
                                             selector:@selector(paymentSuccess:)
                                                 name:kPaymentSuccess
                                               object:nil];
    [[NSNotificationCenter defaultCenter] addObserver:self
                                             selector:@selector(paymentError:)
                                                 name:kPaymentError
                                               object:nil];
    [[NSNotificationCenter defaultCenter]
     addObserver:self
     selector:@selector(externalWalletSelected:)
     name:kExternalWalletSelected
     object:nil];
}

- (void)stopObserving {
    [[NSNotificationCenter defaultCenter] removeObserver:self];
}

- (void)paymentSuccess:(NSNotification *)notification {
    [self sendEventWithName:@"Razorpay::PAYMENT_SUCCESS"
                       body:notification.userInfo];
}

- (void)paymentError:(NSNotification *)notification {
    [self sendEventWithName:@"Razorpay::PAYMENT_ERROR"
                       body:notification.userInfo];
}

- (void)externalWalletSelected:(NSNotification *)notification {
    [self sendEventWithName:@"Razorpay::EXTERNAL_WALLET_SELECTED"
                       body:notification.userInfo];
}

+ (void)onPaymentSuccess:(NSString *)payment_id
                 andData:(NSDictionary *)response {
    NSDictionary *payload = [NSDictionary dictionaryWithDictionary:response];
    [[NSNotificationCenter defaultCenter] postNotificationName:kPaymentSuccess
                                                        object:nil
                                                      userInfo:payload];
}

+ (void)onPaymentError:(int)code
           description:(NSString *)str
               andData:(NSDictionary *)response {
    NSDictionary *payload = @{
      @"code" : @(code),
      @"description" : str,
      @"details" : response
    };
    [[NSNotificationCenter defaultCenter] postNotificationName:kPaymentError
                                                        object:nil
                                                      userInfo:payload];
}

+ (void)onExternalWalletSelected:(NSString *)walletName
                         andData:(NSDictionary *)paymentData {
    
    NSMutableDictionary *payload = [[NSMutableDictionary alloc] init];
    [payload addEntriesFromDictionary: paymentData];
    [payload setValue:walletName forKey:@"external_wallet"];
    
    [[NSNotificationCenter defaultCenter]
     postNotificationName:kExternalWalletSelected
     object:nil
     userInfo:payload];
}

@end
