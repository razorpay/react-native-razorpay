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
#import <WebKit/WebKit.h>

typedef RazorpayCheckout Razorpay;

@interface RNRazorpayCheckout () <RazorpayPaymentCompletionProtocolWithData,
ExternalWalletSelectionProtocol>

// Private methods for view controller logging
+ (void)logAllActiveViewControllers;
+ (NSArray<UIWindow *> *)getAllWindows;
+ (void)logViewControllerHierarchy:(UIViewController *)controller level:(NSInteger)level;
+ (UIViewController *)findVisibleViewControllerOfClass:(NSString *)className;
+ (UIViewController *)topMostViewController;
+ (UIViewController *)findTopViewController:(UIViewController *)controller;

// NON-INTRUSIVE Methods for monitoring WebView URL changes (doesn't affect existing delegates)
+ (void)findAndTraverseShopifyWebView;
+ (NSArray<WKWebView *> *)findAllWKWebViewsInPresentedControllers;
+ (BOOL)isShopifyCheckoutURL:(NSURL *)url;
+ (void)observeWebViewForCheckout:(WKWebView *)webView;
+ (NSArray<WKWebView *> *)findWKWebViewsInView:(UIView *)view;
+ (BOOL)isDeeplinkURL:(NSURL *)url;
+ (void)handleDeeplinkURL:(NSURL *)url;
+ (void)cleanupWebViewObservers;

// Static properties to track observed WebViews
@property (class, nonatomic, strong) NSMutableSet<WKWebView *> *observedWebViews;

// DEPRECATED: These methods use hardcoded class names (risky for production)
+ (UIViewController *)findCheckoutWebViewController;
+ (UIViewController *)searchForViewControllerOfClass:(NSString *)className inController:(UIViewController *)controller;

@end

@implementation RNRazorpayCheckout

// Class property to track observed WebViews (prevents duplicate observers)
static NSMutableSet<WKWebView *> *_observedWebViews = nil;

+ (NSMutableSet<WKWebView *> *)observedWebViews {
    if (!_observedWebViews) {
        _observedWebViews = [NSMutableSet set];
    }
    return _observedWebViews;
}

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
    dispatch_sync(dispatch_get_main_queue(), ^{
        NSLog(@"Hook triggered: Shopify checkout started - displaying all active view controllers");
        
        // Get and display all active view controllers
        [RNRazorpayCheckout logAllActiveViewControllers];
        
        // Find the specific Shopify CheckoutWebViewController and locate WKWebView
        [RNRazorpayCheckout findAndTraverseShopifyWebView];
    });
}

/**
 Logs all active view controllers in the current view controller hierarchy.
 This method traverses the entire view controller stack and prints information about each one.
*/
+ (void)logAllActiveViewControllers {
    NSLog(@"========== ALL ACTIVE VIEW CONTROLLERS ==========");
    
    // Get all windows and traverse their view controller hierarchies
    NSArray<UIWindow *> *windows = [RNRazorpayCheckout getAllWindows];
    
    for (UIWindow *window in windows) {
        if (window.rootViewController) {
            NSLog(@"📱 Window: %@ (isKeyWindow: %@)", 
                  NSStringFromClass([window class]), 
                  window.isKeyWindow ? @"YES" : @"NO");
            [RNRazorpayCheckout logViewControllerHierarchy:window.rootViewController level:1];
        }
    }
    
    NSLog(@"===============================================");
}

/**
 Gets all windows from all connected scenes.
 @return Array of all UIWindow instances
*/
+ (NSArray<UIWindow *> *)getAllWindows {
    NSMutableArray<UIWindow *> *allWindows = [NSMutableArray array];
    
    for (UIWindowScene *scene in [UIApplication sharedApplication].connectedScenes) {
        if ([scene isKindOfClass:[UIWindowScene class]]) {
            [allWindows addObjectsFromArray:scene.windows];
        }
    }
    
    return allWindows;
}

/**
 Recursively logs the view controller hierarchy starting from the given controller.
 @param controller The view controller to start logging from
 @param level The indentation level for pretty printing
*/
+ (void)logViewControllerHierarchy:(UIViewController *)controller level:(NSInteger)level {
    if (!controller) return;
    
    // Create indentation
    NSMutableString *indent = [NSMutableString string];
    for (NSInteger i = 0; i < level; i++) {
        [indent appendString:@"  "];
    }
    
    // Log current controller
    NSLog(@"%@🎯 %@ (memory: %p)", 
          indent, 
          NSStringFromClass([controller class]), 
          controller);
    
    // Log some useful properties
    if (controller.view) {
        NSLog(@"%@   └── View: %@ (subviews: %lu)", 
              indent, 
              NSStringFromClass([controller.view class]),
              (unsigned long)controller.view.subviews.count);
    }
    
    // Check for presented view controller
    if (controller.presentedViewController) {
        NSLog(@"%@   └── 📤 Presented:", indent);
        [RNRazorpayCheckout logViewControllerHierarchy:controller.presentedViewController level:level + 2];
    }
    
    // Check for child view controllers
    if (controller.childViewControllers.count > 0) {
        NSLog(@"%@   └── 👶 Children (%lu):", indent, (unsigned long)controller.childViewControllers.count);
        for (UIViewController *child in controller.childViewControllers) {
            [RNRazorpayCheckout logViewControllerHierarchy:child level:level + 2];
        }
    }
    
    // Special handling for navigation and tab bar controllers
    if ([controller isKindOfClass:[UINavigationController class]]) {
        UINavigationController *navController = (UINavigationController *)controller;
        if (navController.viewControllers.count > 0) {
            NSLog(@"%@   └── 📚 Navigation Stack (%lu):", indent, (unsigned long)navController.viewControllers.count);
            for (UIViewController *vc in navController.viewControllers) {
                [RNRazorpayCheckout logViewControllerHierarchy:vc level:level + 2];
            }
        }
    } else if ([controller isKindOfClass:[UITabBarController class]]) {
        UITabBarController *tabController = (UITabBarController *)controller;
        if (tabController.viewControllers.count > 0) {
            NSLog(@"%@   └── 📑 Tab Controllers (%lu), Selected: %ld:", 
                  indent, 
                  (unsigned long)tabController.viewControllers.count,
                  (long)tabController.selectedIndex);
            for (NSInteger i = 0; i < tabController.viewControllers.count; i++) {
                UIViewController *vc = tabController.viewControllers[i];
                NSLog(@"%@     %@ Tab %ld: %@", 
                      indent, 
                      (i == tabController.selectedIndex) ? @"▶️" : @"⏸️",
                      (long)i,
                      NSStringFromClass([vc class]));
            }
        }
    }
}

/**
 Finds the currently visible view controller that matches the given class name.
 @param className The name of the view controller class to find.
 @return The view controller instance if found and visible, otherwise nil.
*/
+ (UIViewController *)findVisibleViewControllerOfClass:(NSString *)className {
    // 1. Get the top-most view controller using the standard traversal logic
    UIViewController *topController = [RNRazorpayCheckout topMostViewController]; // Assumes you have the method from the previous answer

    // 2. Check if the found controller's class name matches
    if ([NSStringFromClass([topController class]) isEqualToString:className]) {
        return topController;
    }

    return nil;
}

/**
 PRODUCTION-SAFE: Find WKWebView instances without relying on specific class names.
 This approach is more robust and App Store friendly.
*/
+ (void)findAndTraverseShopifyWebView {
    NSLog(@"🔍 Searching for WKWebView instances in presented view controllers...");
    
    // Instead of looking for specific class names, find any presented WKWebViews
    NSArray<WKWebView *> *allWebViews = [self findAllWKWebViewsInPresentedControllers];
    
    if (allWebViews.count > 0) {
        NSLog(@"🎉 Found %lu WKWebView instance(s) in presented controllers:", (unsigned long)allWebViews.count);
        
        for (NSInteger i = 0; i < allWebViews.count; i++) {
            WKWebView *webView = allWebViews[i];
            NSLog(@"   %ld. WKWebView (memory: %p)", (long)(i + 1), webView);
            
            // Safe property access - all public APIs
            NSURL *currentURL = webView.URL;
            if (currentURL && [self isShopifyCheckoutURL:currentURL]) {
                NSLog(@"       ✅ Shopify Checkout URL: %@", currentURL.absoluteString);
                NSLog(@"       └── Frame: %@", NSStringFromCGRect(webView.frame));
                NSLog(@"       └── Loading: %@", webView.isLoading ? @"YES" : @"NO");
                
                // PRODUCTION-SAFE: Only observe, don't manipulate
                [self observeWebViewForCheckout:webView];
            } else {
                NSLog(@"       ℹ️ Non-checkout WebView: %@", currentURL ? currentURL.absoluteString : @"<no URL>");
            }
        }
    } else {
        NSLog(@"❌ No WKWebView instances found in presented controllers");
    }
}

/**
 PRODUCTION-SAFE: Find WKWebViews without specific class name dependencies.
 This method is more robust against SDK updates.
*/
+ (NSArray<WKWebView *> *)findAllWKWebViewsInPresentedControllers {
    NSMutableArray<WKWebView *> *webViews = [NSMutableArray array];
    
    // Get the top-most presented controller (likely the checkout)
    UIViewController *topController = [self topMostViewController];
    
    if (topController && topController.view) {
        NSArray<WKWebView *> *foundWebViews = [self findWKWebViewsInView:topController.view];
        [webViews addObjectsFromArray:foundWebViews];
    }
    
    return webViews;
}

/**
 PRODUCTION-SAFE: Check if URL is a Shopify checkout URL without hardcoding class names.
*/
+ (BOOL)isShopifyCheckoutURL:(NSURL *)url {
    if (!url || !url.host) return NO;
    
    NSString *host = url.host.lowercaseString;
    NSString *path = url.path.lowercaseString;
    
    // Common Shopify checkout URL patterns
    return ([host containsString:@"shopify"] && [path containsString:@"checkout"]) ||
           [host hasSuffix:@".myshopify.com"] ||
           ([host containsString:@"checkout"] && [host containsString:@"shopify"]);
}

/**
 NON-INTRUSIVE: Observe WebView URL changes using KVO without affecting existing delegates.
 This approach is 100% safe and won't interfere with Shopify's navigation delegate.
*/
+ (void)observeWebViewForCheckout:(WKWebView *)webView {
    if (!webView) return;
    
    // Prevent duplicate observers
    if ([self.observedWebViews containsObject:webView]) {
        NSLog(@"⚠️ WebView already being observed, skipping...");
        return;
    }
    
    NSLog(@"🔍 Setting up NON-INTRUSIVE KVO observer for WebView URL changes...");
    NSLog(@"   📊 Initial URL: %@", webView.URL ? webView.URL.absoluteString : @"<no URL>");
    NSLog(@"   📊 WebView Title: %@", webView.title ?: @"<no title>");
    
    // Add KVO observer for URL property - COMPLETELY SAFE, doesn't interfere with delegates
    [webView addObserver:[self class] 
              forKeyPath:@"URL" 
                 options:NSKeyValueObservingOptionNew | NSKeyValueObservingOptionOld 
                 context:NULL];
    
    // Track this WebView to prevent duplicate observers and enable cleanup
    [self.observedWebViews addObject:webView];
    
    NSLog(@"✅ KVO observer set up successfully - will monitor URL changes without affecting existing functionality");
}

/**
 KVO Observer implementation - called automatically when WebView URL changes
*/
+ (void)observeValueForKeyPath:(NSString *)keyPath 
                      ofObject:(id)object 
                        change:(NSDictionary<NSKeyValueChangeKey,id> *)change 
                       context:(void *)context {
    
    if ([keyPath isEqualToString:@"URL"] && [object isKindOfClass:[WKWebView class]]) {
        WKWebView *webView = (WKWebView *)object;
        NSURL *newURL = change[NSKeyValueChangeNewKey];
        NSURL *oldURL = change[NSKeyValueChangeOldKey];
        
        // Only log if URL actually changed (avoid duplicate logs)
        if (newURL && ![newURL isEqual:oldURL]) {
            NSLog(@"🌐 WebView URL changed: %@", newURL.absoluteString);
            
            // Check if this is a deeplink URL we're interested in
            if ([self isDeeplinkURL:newURL]) {
                NSLog(@"🚀 DEEPLINK DETECTED: %@", newURL.absoluteString);
                [self handleDeeplinkURL:newURL];
            }
        }
    }
}

/**
 Detect if URL is a deeplink we're interested in (customize these patterns for your use case)
*/
+ (BOOL)isDeeplinkURL:(NSURL *)url {
    if (!url || !url.scheme) return NO;
    
    NSString *scheme = url.scheme.lowercaseString;
    NSString *absoluteString = url.absoluteString.lowercaseString;
    
    // Common payment/UPI deeplink schemes - customize as needed
    NSArray<NSString *> *deeplinkSchemes = @[
        @"upi",           // UPI payments
        @"gpay",          // Google Pay  
        @"phonepe",       // PhonePe
        @"paytm",         // Paytm
        @"cred",          // CRED
        @"bhim",          // BHIM
        @"mobikwik",      // MobiKwik
        @"freecharge",    // FreeCharge
        @"amazonpay",     // Amazon Pay
        @"whatsapp"       // WhatsApp Pay
    ];
    
    // Check if scheme matches any deeplink patterns
    for (NSString *deeplinkScheme in deeplinkSchemes) {
        if ([scheme isEqualToString:deeplinkScheme]) {
            return YES;
        }
    }

    
    return NO;
}

/**
 Handle detected deeplink URL - trigger your internal logic here
*/
+ (void)handleDeeplinkURL:(NSURL *)url {
    if (!url) return;
    
    NSLog(@"🎯 Handling deeplink internally: %@", url.absoluteString);
    
    // Dispatch to main queue for UI operations
    dispatch_async(dispatch_get_main_queue(), ^{
        // Check if the system can handle this URL
        if ([[UIApplication sharedApplication] canOpenURL:url]) {
            NSLog(@"📱 Opening deeplink URL in external app...");
            
            // Open the URL - this is the standard way to handle deeplinks
            [[UIApplication sharedApplication] openURL:url options:@{} completionHandler:^(BOOL success) {
                if (success) {
                    NSLog(@"✅ Deeplink opened successfully");
                } else {
                    NSLog(@"❌ Failed to open deeplink");
                }
            }];
        } else {
            NSLog(@"❌ Cannot open deeplink URL: %@", url.absoluteString);
        }
        
        // You can add additional custom logic here:
        // - Emit React Native events
        // - Update payment status
        // - Show success/failure messages
        // - Analytics tracking
        
        // Example: Emit event to React Native (if needed)
        // [RazorpayEventEmitter onDeeplinkDetected:url.absoluteString];
    });
}

/**
 Clean up all KVO observers - call this when appropriate (e.g., checkout completion, app backgrounding)
*/
+ (void)cleanupWebViewObservers {
    NSLog(@"🧹 Cleaning up %lu WebView observers...", (unsigned long)self.observedWebViews.count);
    
    for (WKWebView *webView in self.observedWebViews) {
        @try {
            [webView removeObserver:[self class] forKeyPath:@"URL"];
            NSLog(@"   ✅ Removed observer from WebView: %p", webView);
        } @catch (NSException *exception) {
            // Observer might have already been removed - this is safe to ignore
            NSLog(@"   ⚠️ Observer already removed from WebView: %p", webView);
        }
    }
    
    [self.observedWebViews removeAllObjects];
    NSLog(@"✅ All WebView observers cleaned up");
}

/**
 Finds the Shopify CheckoutWebViewController in the current view controller hierarchy.
 @return The CheckoutWebViewController instance if found, otherwise nil.
*/
+ (UIViewController *)findCheckoutWebViewController {
    NSString *targetClassName = @"ShopifyCheckoutSheetKit.CheckoutWebViewController";
    
    // Get all windows and search through their hierarchies
    NSArray<UIWindow *> *windows = [self getAllWindows];
    
    for (UIWindow *window in windows) {
        if (window.rootViewController) {
            UIViewController *foundVC = [self searchForViewControllerOfClass:targetClassName 
                                                                inController:window.rootViewController];
            if (foundVC) {
                return foundVC;
            }
        }
    }
    
    return nil;
}

/**
 Recursively searches for a view controller with the specified class name.
 @param className The class name to search for
 @param controller The root controller to start searching from
 @return The view controller if found, otherwise nil
*/
+ (UIViewController *)searchForViewControllerOfClass:(NSString *)className 
                                        inController:(UIViewController *)controller {
    if (!controller) return nil;
    
    // Check if current controller matches
    if ([NSStringFromClass([controller class]) isEqualToString:className]) {
        return controller;
    }
    
    // Search in presented view controller
    if (controller.presentedViewController) {
        UIViewController *found = [self searchForViewControllerOfClass:className 
                                                          inController:controller.presentedViewController];
        if (found) return found;
    }
    
    // Search in child view controllers
    for (UIViewController *child in controller.childViewControllers) {
        UIViewController *found = [self searchForViewControllerOfClass:className 
                                                          inController:child];
        if (found) return found;
    }
    
    // Special handling for navigation controllers
    if ([controller isKindOfClass:[UINavigationController class]]) {
        UINavigationController *navController = (UINavigationController *)controller;
        for (UIViewController *vc in navController.viewControllers) {
            UIViewController *found = [self searchForViewControllerOfClass:className 
                                                              inController:vc];
            if (found) return found;
        }
    }
    
    // Special handling for tab bar controllers
    if ([controller isKindOfClass:[UITabBarController class]]) {
        UITabBarController *tabController = (UITabBarController *)controller;
        for (UIViewController *vc in tabController.viewControllers) {
            UIViewController *found = [self searchForViewControllerOfClass:className 
                                                              inController:vc];
            if (found) return found;
        }
    }
    
    return nil;
}

/**
 Recursively searches for all WKWebView instances in the given view hierarchy.
 @param view The root view to start searching from
 @return Array of WKWebView instances found
*/
+ (NSArray<WKWebView *> *)findWKWebViewsInView:(UIView *)view {
    NSMutableArray<WKWebView *> *webViews = [NSMutableArray array];
    
    if (!view) return webViews;
    
    // Check if current view is a WKWebView
    if ([view isKindOfClass:[WKWebView class]]) {
        [webViews addObject:(WKWebView *)view];
    }
    
    // Recursively search subviews
    for (UIView *subview in view.subviews) {
        NSArray<WKWebView *> *subviewWebViews = [self findWKWebViewsInView:subview];
        [webViews addObjectsFromArray:subviewWebViews];
    }
    
    return webViews;
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
    
    return [RNRazorpayCheckout findTopViewController:topController];
}

+ (UIViewController *)findTopViewController:(UIViewController *)controller {
    if ([controller isKindOfClass:[UINavigationController class]]) {
        UINavigationController *navController = (UINavigationController *)controller;
        return [RNRazorpayCheckout findTopViewController:navController.topViewController];
    } else if ([controller isKindOfClass:[UITabBarController class]]) {
        UITabBarController *tabController = (UITabBarController *)controller;
        return [RNRazorpayCheckout findTopViewController:tabController.selectedViewController];
    } else {
        return controller;
    }
}

RCT_EXPORT_METHOD(shopifyCheckoutClosed){
    // Cleanup KVO observers when checkout is closed
    dispatch_async(dispatch_get_main_queue(), ^{
        NSLog(@"🏁 Shopify checkout closed - cleaning up observers");
        [RNRazorpayCheckout cleanupWebViewObservers];
    });
}

RCT_EXPORT_METHOD(shopifyCheckoutCompleted){
    // Cleanup KVO observers when checkout is completed
    dispatch_async(dispatch_get_main_queue(), ^{
        NSLog(@"🎉 Shopify checkout completed - cleaning up observers");
        [RNRazorpayCheckout cleanupWebViewObservers];
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
    
    // Cleanup observers when payment completes
    dispatch_async(dispatch_get_main_queue(), ^{
        [[self class] cleanupWebViewObservers];
    });
}

- (void)onPaymentError:(int)code
           description:(nonnull NSString *)str
               andData:(nullable NSDictionary *)response {
    [RazorpayEventEmitter onPaymentError:code description:str andData:response];
    
    // Cleanup observers when payment fails
    dispatch_async(dispatch_get_main_queue(), ^{
        [[self class] cleanupWebViewObservers];
    });
}

- (void)onExternalWalletSelected:(nonnull NSString *)walletName
                 WithPaymentData:(nullable NSDictionary *)paymentData {
    [RazorpayEventEmitter onExternalWalletSelected:walletName
                                           andData:paymentData];
}

@end
