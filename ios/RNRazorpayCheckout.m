//
//  RNRazorpayCheckout.m
//  RNRazorpayCheckout
//
//  Created by Akshay Bhalotia on 29/08/16.
//  Copyright © 2016 Razorpay. All rights reserved.
//

#import "RNRazorpayCheckout.h"
#import "RazorpayEventEmitter.h"

#import <Razorpay/Razorpay-Swift.h>

@interface RNRazorpayCheckout () <RazorpayPaymentCompletionProtocolWithData,
ExternalWalletSelectionProtocol>

@end

@implementation RNRazorpayCheckout

RCT_EXPORT_MODULE()

RCT_EXPORT_METHOD(open : (NSDictionary *)options) {
    
    NSString *keyID = (NSString *)[options objectForKey:@"key"];
    dispatch_sync(dispatch_get_main_queue(), ^{
        RazorpayCheckout *razorpay = [RazorpayCheckout initWithKey:keyID
                               andDelegateWithData:self];
        [razorpay setExternalWalletSelectionDelegate:self];
        
        NSMutableDictionary * tempOptions = [[NSMutableDictionary alloc] initWithDictionary:options];
//        tempOptions[@"integration_version"] = [self findReactNativeVersion];
        tempOptions[@"integration"] = @"react-native";
        tempOptions[@"FRAMEWORK"] = @"react-native";
        UIViewController *rootViewController = UIApplication.sharedApplication.delegate.window.rootViewController;

        [razorpay open:tempOptions displayController: [self visibleViewController:rootViewController]];
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

- (UIViewController *)visibleViewController:(UIViewController *)rootViewController {
    if (rootViewController.presentedViewController == nil) {
        return rootViewController;
    }
    if ([rootViewController.presentedViewController isKindOfClass:[UINavigationController class]]) {
        UINavigationController *navigationController = (UINavigationController *)rootViewController.presentedViewController;
        UIViewController *lastViewController = [[navigationController viewControllers] lastObject];

        return [self visibleViewController:lastViewController];
    }
    if ([rootViewController.presentedViewController isKindOfClass:[UITabBarController class]]) {
        UITabBarController *tabBarController = (UITabBarController *)rootViewController.presentedViewController;
        UIViewController *selectedViewController = tabBarController.selectedViewController;

        return [self visibleViewController:selectedViewController];
    }

    UIViewController *presentedViewController = (UIViewController *)rootViewController.presentedViewController;

    return [self visibleViewController:presentedViewController];
}

@end
