//
//  RazorpayCheckout.m
//  RazorpayCheckout
//
//  Created by Akshay Bhalotia on 29/08/16.
//  Copyright © 2016 Razorpay. All rights reserved.
//

#import "RazorpayCheckout.h"
#import "RazorpayEventEmitter.h"

#import <Razorpay/Razorpay-Swift.h>

typedef RazorpayCheckout Razorpay;

@interface RNRazorpayCheckout () <RazorpayPaymentCompletionProtocolWithData,
ExternalWalletSelectionProtocol>

@end

@implementation RNRazorpayCheckout

RCT_EXPORT_MODULE()

RCT_EXPORT_METHOD(open : (NSDictionary *)options) {

    NSString *keyID = (NSString *)[options objectForKey:@"key"];
    dispatch_sync(dispatch_get_main_queue(), ^{
        Razorpay *razorpay = [Razorpay initWithKey:keyID
                               andDelegateWithData:self];
        [razorpay setExternalWalletSelectionDelegate:self];
        NSMutableDictionary * tempOptions = [[NSMutableDictionary alloc] initWithDictionary:options];
        //tempOptions[@"integration_version"] = [self findReactNativeVersion];
        tempOptions[@"integration"] = @"react_native";
        tempOptions[@"FRAMEWORK"] = @"react_native";

        //get root view to present razorpay vc
        id<UIApplicationDelegate> app = [[UIApplication sharedApplication] delegate];
        UINavigationController *rootViewController = ((UINavigationController*) app.window.rootViewController);

        if (rootViewController.presentedViewController) {
            [razorpay open:tempOptions displayController:rootViewController.presentedViewController];
            return;
        }

        //Use 'open' method with displayController parameter
        [razorpay open:tempOptions displayController:rootViewController];
    });
}

/*
- (NSString *)findReactNativeVersion {
    static dispatch_once_t onceToken;
    static NSString *BSGReactNativeVersion = nil;
    dispatch_once(&onceToken, ^{
        #ifdef RCT_REACT_NATIVE_VERSION
            // for react-native versions prior 0.55
            // see https://github.com/react-native-community/releases/blob/451f8e7fa53f80daec9c2381c7984bee73efa51d/CHANGELOG.md#ios-specific-additions
            NSDictionary *versionMap = RCT_REACT_NATIVE_VERSION;
        #else
            NSDictionary *versionMap = RCTGetReactNativeVersion();
        #endif
        NSNumber *major = versionMap[@"major"];
        NSNumber *minor = versionMap[@"minor"];
        NSNumber *patch = versionMap[@"patch"];
        NSString *prerelease = versionMap[@"prerelease"];
        NSMutableString *versionString = [NSMutableString new];

        if (![major isEqual:[NSNull null]]) {
            [versionString appendString:[major stringValue]];
            [versionString appendString:@"."];
        }
        if (![minor isEqual:[NSNull null]]) {
            [versionString appendString:[minor stringValue]];
            [versionString appendString:@"."];
        }
        if (![patch isEqual:[NSNull null]]) {
            [versionString appendString:[patch stringValue]];
        }
        if (![prerelease isEqual:[NSNull null]]) {
            [versionString appendString:@"-"];
            [versionString appendString:prerelease];
        }
        BSGReactNativeVersion = [NSString stringWithString:versionString];
    });
    return BSGReactNativeVersion;
}
*/

- (void)onPaymentSuccess:(nonnull NSString *)payment_id
                 andData:(nullable NSDictionary *)response {
    [RazorpayEventEmitter onPaymentSuccess:payment_id andData:response];
}

- (void)onPaymentError:(int)code
           description:(nonnull NSString *)str
               andData:(nullable NSDictionary *)response {
    [RazorpayEventEmitter onPaymentError:code description:str andData:response];
}

- (void)onExternalWalletSelected:(nonnull NSString *)walletName
                 WithPaymentData:(nullable NSDictionary *)paymentData {
    [RazorpayEventEmitter onExternalWalletSelected:walletName
                                           andData:paymentData];
}

@end
