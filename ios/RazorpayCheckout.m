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
@import RazorpayCore;
#import <WebKit/WebKit.h>
#import <objc/runtime.h>

typedef RazorpayCheckout Razorpay;

// Forward declaration for helper used by the navigation delegate
@class RNRazorpayCheckout;
@interface RNRazorpayCheckout (EvalHelper)
- (void)evaluateScript:(NSString *)javascript onWebView:(WKWebView *)webView context:(NSString *)context;
@end

@interface RazorpayWebViewNavigationDelegate : NSObject <WKNavigationDelegate>
@property (nonatomic, weak) id<WKNavigationDelegate> oldDelegate;
@property (nonatomic, strong) NSString *javascript;
@property (nonatomic, weak) id owner; // weak to avoid retain cycles
@end

@implementation RazorpayWebViewNavigationDelegate

- (instancetype)initWithOldDelegate:(id<WKNavigationDelegate>)oldDelegate javascript:(NSString *)javascript {
    self = [super init];
    if (self) {
        _oldDelegate = oldDelegate;
        _javascript = javascript;
    }
    return self;
}

- (void)webView:(WKWebView *)webView didStartProvisionalNavigation:(WKNavigation *)navigation {
    NSLog(@"[Razorpay][iOS] RazorpayWebViewNavigationDelegate: didStartProvisionalNavigation, url: %@", webView.URL.absoluteString);
    // Inject as early as possible for this navigation.
    if ([self.owner respondsToSelector:@selector(evaluateScript:onWebView:context:)]) {
        [(id)self.owner evaluateScript:self.javascript onWebView:webView context:@"didStart injection"];
    }
    if ([self.oldDelegate respondsToSelector:@selector(webView:didStartProvisionalNavigation:)]) {
        [self.oldDelegate webView:webView didStartProvisionalNavigation:navigation];
    }
}

- (void)webView:(WKWebView *)webView didFinishNavigation:(WKNavigation *)navigation {
    NSLog(@"[Razorpay][iOS] RazorpayWebViewNavigationDelegate: didFinishNavigation, url: %@", webView.URL.absoluteString);
    // Ensure script is injected even when there are no further navigations.
    if ([self.owner respondsToSelector:@selector(evaluateScript:onWebView:context:)]) {
        [(id)self.owner evaluateScript:self.javascript onWebView:webView context:@"didFinish injection"];
    }
    if ([self.oldDelegate respondsToSelector:@selector(webView:didFinishNavigation:)]) {
        [self.oldDelegate webView:webView didFinishNavigation:navigation];
    }
}

- (void)webView:(WKWebView *)webView didFailNavigation:(WKNavigation *)navigation withError:(NSError *)error {
    NSLog(@"[Razorpay][iOS] RazorpayWebViewNavigationDelegate: didFailNavigation error: %@", error.localizedDescription);
    if ([self.oldDelegate respondsToSelector:@selector(webView:didFailNavigation:withError:)]) {
        [self.oldDelegate webView:webView didFailNavigation:navigation withError:error];
    }
}

- (void)webView:(WKWebView *)webView decidePolicyForNavigationAction:(WKNavigationAction *)navigationAction decisionHandler:(void (^)(WKNavigationActionPolicy))decisionHandler {
    NSURL *url = navigationAction.request.URL;
    NSString *scheme = url.scheme.lowercaseString;
    BOOL isHttp = [scheme isEqualToString:@"http"] || [scheme isEqualToString:@"https"];
    NSSet *internalSchemes = [NSSet setWithObjects:@"about", @"file", @"data", @"blob", @"javascript", nil];
    BOOL isInternal = (scheme.length == 0) || [internalSchemes containsObject:scheme];
    
    // Inject on every navigation decision (window state can reset on redirects)
    if ([self.owner respondsToSelector:@selector(evaluateScript:onWebView:context:)]) {
        [(id)self.owner evaluateScript:self.javascript onWebView:webView context:@"decidePolicy injection"];
    }
    
    // Handle external schemes (like UPI deep links: phonepe://, gpay://, etc.)
    if (url != nil && !isHttp && !isInternal) {
        NSLog(@"shouldOverrideUrlLoading: %@", url.absoluteString);
        if ([[UIApplication sharedApplication] canOpenURL:url]) {
            [[UIApplication sharedApplication] openURL:url options:@{} completionHandler:nil];
            decisionHandler(WKNavigationActionPolicyCancel);
            return;
        }
    }
    
    if ([self.oldDelegate respondsToSelector:@selector(webView:decidePolicyForNavigationAction:decisionHandler:)]) {
        [self.oldDelegate webView:webView decidePolicyForNavigationAction:navigationAction decisionHandler:decisionHandler];
        return;
    }
    
    decisionHandler(WKNavigationActionPolicyAllow);
}

- (id)forwardingTargetForSelector:(SEL)aSelector {
    if ([self.oldDelegate respondsToSelector:aSelector]) {
        return self.oldDelegate;
    }
    return [super forwardingTargetForSelector:aSelector];
}

- (BOOL)respondsToSelector:(SEL)aSelector {
    if ([super respondsToSelector:aSelector]) {
        return YES;
    }
    return [self.oldDelegate respondsToSelector:aSelector];
}

@end

@interface RNRazorpayCheckout () <RazorpayPaymentCompletionProtocolWithData,
ExternalWalletSelectionProtocol>

@property (nonatomic, strong) RazorpayWebViewNavigationDelegate *navigationDelegateProxy;

@end

@implementation RNRazorpayCheckout

RCT_EXPORT_MODULE()

// Log module initialization to verify the native module is loaded.
- (instancetype)init {
    self = [super init];
    if (self) {
        NSLog(@"[Razorpay][iOS] RNRazorpayCheckout init");
    }
    return self;
}

// Explicitly opt-in to main queue setup (module already uses main-thread work).
+ (BOOL)requiresMainQueueSetup {
    return YES;
}

static const NSInteger kMaxInjectionAttempts = 3;
static const double kRetryDelaySeconds = 0.2;

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

// - (void)onExternalWalletSelected:(nonnull NSString *)walletName
//                  WithPaymentData:(nullable NSDictionary *)paymentData {
//     [RazorpayEventEmitter onExternalWalletSelected:walletName
//                                            andData:paymentData];
// }

- (void)onExternalWalletSelected:(NSString * _Nonnull)walletName withPaymentData:(NSDictionary * _Nullable)paymentData { 
    [RazorpayEventEmitter onExternalWalletSelected:walletName
                                           andData:paymentData];
}

RCT_EXPORT_METHOD(testMethodForInvocation: (NSString *)text){
    NSLog(@"[Razorpay][iOS] testMethodForInvocation called ");
}

RCT_EXPORT_METHOD(injectJavascriptIntoWebView:(NSString *)javascript isCheckoutSheetKit:(NSNumber *)isCheckoutSheetKit) {
    NSLog(@"[Razorpay][iOS] injectJavascriptIntoWebView called");
    [self injectJavascriptIntoWebView:javascript isCheckoutSheetKit:isCheckoutSheetKit attempt:1];
}

- (void)injectJavascriptIntoWebView:(NSString *)javascript isCheckoutSheetKit:(NSNumber *)isCheckoutSheetKit attempt:(NSInteger)attempt {
    NSLog(@"[Razorpay][iOS] injectJavascriptIntoWebView");
    dispatch_async(dispatch_get_main_queue(), ^{
        BOOL useCheckoutSheetKit = isCheckoutSheetKit != nil && [isCheckoutSheetKit boolValue];
        WKWebView *webView = useCheckoutSheetKit
            ? [self resolveCheckoutKitWebView]
            : [self resolveReactNativeWebView];

        if (webView == nil) {
            if (attempt < kMaxInjectionAttempts) {
                NSLog(@"[Razorpay][iOS] webView is null, retrying inject attempt %ld", (long)attempt);
                dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(kRetryDelaySeconds * NSEC_PER_SEC)), dispatch_get_main_queue(), ^{
                    [self injectJavascriptIntoWebView:javascript isCheckoutSheetKit:isCheckoutSheetKit attempt:attempt + 1];
                });
            } else {
                NSLog(@"[Razorpay][iOS] webView is null after %ld attempts, skipping injection", (long)attempt);
            }
            return;
        }

        NSLog(@"[Razorpay][iOS] webView resolved. Source checkout-sheet-kit: %d", useCheckoutSheetKit);

        // TODO: Remove isInspectable flag for production builds.
//        if (@available(iOS 16.4, *)) {
//            webView.inspectable = YES;
//            NSLog(@"[Razorpay][iOS] webView.inspectable set to YES");
//        }

        [self proxyWebViewNavigationDelegateAndInjectJavascript:webView javascript:javascript];
    });
}

- (WKWebView *)resolveCheckoutKitWebView {
    // Note: The cache property is private in Swift and not accessible via Objective-C runtime
    // Strategy: Use view hierarchy search as primary method (works in all scenarios)
    
    // Primary: Search for CheckoutWebView instances in view hierarchy
    // This works regardless of preloading settings (enabled/disabled)
    WKWebView *checkoutWebView = [self findCheckoutWebViewInHierarchy];
    if (checkoutWebView != nil) {
        NSLog(@"[Razorpay][iOS] resolveCheckoutKitWebView: found via hierarchy");
        return checkoutWebView;
    }
    
    // Fallback 1: Try uncacheableViewRef (only available when preloading is disabled)
    WKWebView *uncachedRef = [self getCheckoutKitUncachedRef];
    if (uncachedRef != nil) {
        NSLog(@"[Razorpay][iOS] resolveCheckoutKitWebView: found via uncacheableViewRef");
        return uncachedRef;
    }
    
    // Fallback 2: Search in presented view controllers
    WKWebView *presentedWebView = [self findWebViewInPresentedViewControllers];
    if (presentedWebView != nil) {
        NSLog(@"[Razorpay][iOS] resolveCheckoutKitWebView: found via presented view controllers");
        return presentedWebView;
    }
    
    NSLog(@"[Razorpay][iOS] resolveCheckoutKitWebView: not found");
    return nil;
}

- (WKWebView *)resolveReactNativeWebView {
    UIViewController *rootViewController = [UIApplication sharedApplication].delegate.window.rootViewController;
    if (rootViewController == nil) {
        NSLog(@"[Razorpay][iOS] resolveReactNativeWebView: rootViewController is nil");
        return nil;
    }
    
    UIView *rootView = rootViewController.view;
    WKWebView *webView = [self findFirstWebView:rootView];
    if (webView != nil) {
        NSLog(@"[Razorpay][iOS] resolveReactNativeWebView: found via hierarchy");
    } else {
        NSLog(@"[Razorpay][iOS] resolveReactNativeWebView: not found");
    }
    return webView;
}

- (WKWebView *)getCheckoutKitUncachedRef {
    @try {
        // Access CheckoutWebView class using runtime
        Class checkoutWebViewClass = NSClassFromString(@"CheckoutWebView");
        if (checkoutWebViewClass == nil) {
            // Try with module prefix
            checkoutWebViewClass = NSClassFromString(@"ShopifyCheckoutSheetKit.CheckoutWebView");
        }
        
        if (checkoutWebViewClass == nil) {
            NSLog(@"[Razorpay][iOS] CheckoutWebView class not found");
            return nil;
        }
        
        // Access the public static uncacheableViewRef property
        // This is a weak static var, so it's accessible (not private)
        SEL uncachedRefSelector = NSSelectorFromString(@"uncacheableViewRef");
        if ([checkoutWebViewClass respondsToSelector:uncachedRefSelector]) {
            #pragma clang diagnostic push
            #pragma clang diagnostic ignored "-Warc-performSelector-leaks"
            IMP refImp = [checkoutWebViewClass methodForSelector:uncachedRefSelector];
            id (*refFunc)(id, SEL) = (id (*)(id, SEL))refImp;
            id uncachedRef = refFunc(checkoutWebViewClass, uncachedRefSelector);
            #pragma clang diagnostic pop
            
            if (uncachedRef != nil && uncachedRef != [NSNull null] && [uncachedRef isKindOfClass:[WKWebView class]]) {
                NSLog(@"[Razorpay][iOS] Found checkout-sheet-kit webview from uncacheableViewRef");
                return (WKWebView *)uncachedRef;
            }
        }
        
        // Note: The cache property is private and cannot be accessed via Objective-C runtime
        // Swift's private access control prevents runtime access even with reflection
    } @catch (NSException *exception) {
        NSLog(@"[Razorpay][iOS] CheckoutWebView uncacheableViewRef access failed: %@", exception.reason);
    }
    
    return nil;
}

- (WKWebView *)findCheckoutWebViewInHierarchy {
    // Search for CheckoutWebView instances in the view hierarchy
    UIViewController *rootViewController = [UIApplication sharedApplication].delegate.window.rootViewController;
    if (rootViewController == nil) {
        return nil;
    }
    
    Class checkoutWebViewClass = NSClassFromString(@"CheckoutWebView");
    if (checkoutWebViewClass == nil) {
        checkoutWebViewClass = NSClassFromString(@"ShopifyCheckoutSheetKit.CheckoutWebView");
    }
    
    if (checkoutWebViewClass == nil) {
        return nil;
    }
    
    // Search in all view controllers
    NSMutableArray<UIViewController *> *viewControllers = [NSMutableArray arrayWithObject:rootViewController];
    
    // Add presented view controllers
    UIViewController *currentVC = rootViewController;
    while (currentVC.presentedViewController != nil) {
        currentVC = currentVC.presentedViewController;
        [viewControllers addObject:currentVC];
    }
    
    // Add navigation controller stack
    if ([rootViewController isKindOfClass:[UINavigationController class]]) {
        UINavigationController *navController = (UINavigationController *)rootViewController;
        [viewControllers addObjectsFromArray:navController.viewControllers];
    }
    
    // Search for CheckoutWebView in each view controller's view hierarchy
    for (UIViewController *vc in viewControllers) {
        WKWebView *webView = [self findCheckoutWebViewInView:vc.view checkoutWebViewClass:checkoutWebViewClass];
        if (webView != nil) {
            NSLog(@"[Razorpay][iOS] resolveCheckoutKitWebView: found CheckoutWebView in VC hierarchy");
            return webView;
        }
    }
    
    return nil;
}

- (WKWebView *)findCheckoutWebViewInView:(UIView *)rootView checkoutWebViewClass:(Class)checkoutWebViewClass {
    if (rootView == nil) {
        return nil;
    }
    
    // Check if this view is a CheckoutWebView
    if ([rootView isKindOfClass:checkoutWebViewClass]) {
        return (WKWebView *)rootView;
    }
    
    // Recursively search subviews
    for (UIView *subview in rootView.subviews) {
        WKWebView *webView = [self findCheckoutWebViewInView:subview checkoutWebViewClass:checkoutWebViewClass];
        if (webView != nil) {
            NSLog(@"[Razorpay][iOS] findCheckoutWebViewInView: found CheckoutWebView in subview");
            return webView;
        }
    }
    
    return nil;
}

- (WKWebView *)findWebViewInPresentedViewControllers {
    UIViewController *rootViewController = [UIApplication sharedApplication].delegate.window.rootViewController;
    
    // Check presented view controllers
    UIViewController *currentVC = rootViewController;
    while (currentVC.presentedViewController != nil) {
        currentVC = currentVC.presentedViewController;
        WKWebView *webView = [self findFirstWebView:currentVC.view];
        if (webView != nil) {
            NSLog(@"[Razorpay][iOS] findWebViewInPresentedViewControllers: found WebView in presented VC");
            return webView;
        }
    }
    
    // Check navigation controller stack
    if ([rootViewController isKindOfClass:[UINavigationController class]]) {
        UINavigationController *navController = (UINavigationController *)rootViewController;
        for (UIViewController *vc in navController.viewControllers) {
            WKWebView *webView = [self findFirstWebView:vc.view];
            if (webView != nil) {
                return webView;
            }
        }
    }
    
    return nil;
}

- (WKWebView *)findFirstWebView:(UIView *)rootView {
    NSLog(@"findFirstWebView");
    if (rootView == nil) {
        NSLog(@"rootView is null");
        return nil;
    }
    
    if ([rootView isKindOfClass:[WKWebView class]]) {
        NSLog(@"rootView is instance of WKWebView");
        return (WKWebView *)rootView;
    }
    
    NSLog(@"rootView is instance of UIView");
    // Recursively search subviews
    for (UIView *subview in rootView.subviews) {
        WKWebView *webView = [self findFirstWebView:subview];
        if (webView != nil) {
            NSLog(@"childView is not null");
            return webView;
        }
    }
    
    return nil;
}

- (void)proxyWebViewNavigationDelegateAndInjectJavascript:(WKWebView *)webView javascript:(NSString *)javascript {
    NSLog(@"[Razorpay][iOS] proxyWebViewNavigationDelegateAndInjectJavascript");
    
    id<WKNavigationDelegate> oldDelegate = webView.navigationDelegate;
    
    RazorpayWebViewNavigationDelegate *newDelegate = [[RazorpayWebViewNavigationDelegate alloc] initWithOldDelegate:oldDelegate javascript:javascript];
    newDelegate.owner = self; // to call evaluateScript helper
    
    // Keep a strong reference; WKWebView.navigationDelegate is weak.
    self.navigationDelegateProxy = newDelegate;
    webView.navigationDelegate = newDelegate;
    
    // Also attach a user script to run at document start for all frames.
    WKUserContentController *controller = webView.configuration.userContentController;
    WKUserScript *userScript = [[WKUserScript alloc] initWithSource:javascript
                                                      injectionTime:WKUserScriptInjectionTimeAtDocumentStart
                                                   forMainFrameOnly:NO];
    [controller addUserScript:userScript];
    
    // Also inject immediately in case the page is already loaded.
    [self evaluateScript:javascript onWebView:webView context:@"immediate injection"];
    
    // Probe current document state for debugging
    NSString *probe = @"(function(){return {readyState: document.readyState, url: window.location.href};})();";
    [self evaluateScript:probe onWebView:webView context:@"probe readyState"];
}

@end

@implementation RNRazorpayCheckout (EvalHelper)

// MARK: - Helper to evaluate JS with logging
- (void)evaluateScript:(NSString *)javascript onWebView:(WKWebView *)webView context:(NSString *)context {
    if (javascript == nil || javascript.length == 0) {
        NSLog(@"[Razorpay][iOS] evaluateScript skipped (empty script) for context: %@", context);
        return;
    }
    [webView evaluateJavaScript:javascript completionHandler:^(id result, NSError *error) {
        if (error) {
            NSLog(@"[Razorpay][iOS] evaluateScript error (%@): %@", context, error.localizedDescription);
        } else {
            NSLog(@"[Razorpay][iOS] evaluateScript success (%@), result: %@", context, result);
        }
    }];
}

- (BOOL)hasInjectedOnWebView:(WKWebView *)webView {
    // No-op: injecting on every navigation decision now
    return NO;
}

- (void)markInjectedOnWebView:(WKWebView *)webView {
    // No-op: injecting on every navigation decision now
}

@end
