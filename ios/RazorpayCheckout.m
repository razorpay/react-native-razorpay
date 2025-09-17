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

#import <UIKit/UIKit.h>

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

RCT_EXPORT_METHOD(callNativeIntentUrl : (NSString *)intentUrl) {
    dispatch_sync(dispatch_get_main_queue(), ^{
        NSURL *url = [NSURL URLWithString:intentUrl];
        if (url && [[UIApplication sharedApplication] canOpenURL:url]) {
            [[UIApplication sharedApplication] openURL:url options:@{} completionHandler:nil];
        }
    });
}

RCT_EXPORT_METHOD(shopifyCheckoutStarted) {
    NSString *viewControllerName = @"CheckoutWebViewController";
    dispatch_sync(dispatch_get_main_queue(), ^{
        NSLog(@"Hook triggered: %@ is now visible.", viewControllerName);

        // Use the helper function to get the actual instance
        UIViewController *targetVC = [RNRazorpayCheckout findVisibleViewControllerOfClass:viewControllerName];

        if (targetVC) {
            NSLog(@"Successfully got reference to %@.", targetVC);

            // Now you can traverse its subviews
            NSLog(@"Traversing subviews of %@'s view:", viewControllerName);
            for (UIView *subview in targetVC.view.subviews) {
                NSLog(@" - Found subview: %@", NSStringFromClass([subview class]));
                // You can add more logic here, like finding a specific button or label
            }
        } else {
            NSLog(@"Could not find an active view controller named %@.", viewControllerName);
        }
    });
}

/**
 Finds the currently visible view controller that matches the given class name.
 @param className The name of the view controller class to find.
 @return The view controller instance if found and visible, otherwise nil.
*/
+ (UIViewController *)findVisibleViewControllerOfClass:(NSString *)className {
    // 1. Get the top-most view controller using the standard traversal logic
    UIViewController *topController = [self topMostViewController]; // Assumes you have the method from the previous answer

    // 2. Check if the found controller's class name matches
    if ([NSStringFromClass([topController class]) isEqualToString:className]) {
        return topController;
    }

    return nil;
}

// NOTE: This requires the `topMostViewController` method from the previous answer.
// Make sure it is also included in the same class or category.
+ (UIViewController *)topMostViewController {
    // ... implementation from the previous answer
    UIWindow *keyWindow = nil;
    for (UIWindowScene *scene in [UIApplication sharedApplication].connectedScenes) {
        if (scene.activationState == UISceneActivationStateForegroundActive) {
            for (UIWindow *window in scene.windows) {
                if (window.isKeyWindow) {
                    keyWindow = window;
                    break;
                }
            }
        }
        if (keyWindow) break;
    }

    UIViewController *topController = keyWindow.rootViewController;
    
    while (topController.presentedViewController) {
        topController = topController.presentedViewController;
    }
    
    return [self findTopViewController:topController];
}

+ (UIViewController *)findTopViewController:(UIViewController *)controller {
    if ([controller isKindOfClass:[UINavigationController class]]) {
        UINavigationController *navController = (UINavigationController *)controller;
        return [self findTopViewController:navController.topViewController];
    } else if ([controller isKindOfClass:[UITabBarController class]]) {
        UITabBarController *tabController = (UITabBarController *)controller;
        return [self findTopViewController:tabController.selectedViewController];
    } else {
        return controller;
    }
}

RCT_EXPORT_METHOD(shopifyCheckoutClosed){

}

RCT_EXPORT_METHOD(shopifyCheckoutCompleted){
    
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
