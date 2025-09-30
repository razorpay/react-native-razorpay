#import "Razorpay.h"
#import "RazorpayEventEmitter.h"
#import <Razorpay/Razorpay-Swift.h>

@interface Razorpay () <RazorpayPaymentCompletionProtocolWithData, ExternalWalletSelectionProtocol>
@end

@implementation Razorpay {
    RazorpayCheckout *razorpay;
}

RCT_EXPORT_MODULE()

// MARK: - TurboModule Methods
- (NSNumber *)multiply:(double)a b:(double)b {
    NSLog(@"Razorpay multiply called with a=%f, b=%f", a, b);
    NSNumber *result = @(a * b);
    return result;
}

RCT_EXPORT_METHOD(open:(NSDictionary *)options) {
    NSLog(@"Razorpay open method called with options: %@", options);
    dispatch_async(dispatch_get_main_queue(), ^{
        [self openRazorpayCheckoutWithOptions:options];
    });
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
    return std::make_shared<facebook::react::NativeRazorpaySpecJSI>(params);
}

// MARK: - Private Implementation
- (void)openRazorpayCheckoutWithOptions:(NSDictionary *)options {
    NSLog(@"openRazorpayCheckoutWithOptions called with: %@", options);
    
    NSString *keyID = options[@"key"];
    if (!keyID || ![keyID isKindOfClass:[NSString class]]) {
        NSLog(@"Invalid key provided");
        [RazorpayEventEmitter onPaymentError:-1 description:@"Invalid key provided" andData:@{}];
        return;
    }
    
    NSLog(@"Creating RazorpayCheckout with key: %@", keyID);
    razorpay = [RazorpayCheckout initWithKey:keyID andDelegateWithData:self];
    [razorpay setExternalWalletSelectionDelegate:self];
    
    // Prepare options
    NSMutableDictionary *mutableOptions = [options mutableCopy];
    mutableOptions[@"integration"] = @"react_native";
    mutableOptions[@"FRAMEWORK"] = @"react_native";
    
    NSLog(@"Prepared options: %@", mutableOptions);
    
    // Get root view controller
    UIWindowScene *windowScene = nil;
    for (UIScene *scene in [UIApplication sharedApplication].connectedScenes) {
        if ([scene isKindOfClass:[UIWindowScene class]]) {
            windowScene = (UIWindowScene *)scene;
            break;
        }
    }
    
    if (!windowScene) {
        NSLog(@"Unable to get window scene");
        [RazorpayEventEmitter onPaymentError:-1 description:@"Unable to get window scene" andData:@{}];
        return;
    }
    
    UIWindow *window = windowScene.windows.firstObject;
    UIViewController *rootViewController = window.rootViewController;
    
    if (!rootViewController) {
        NSLog(@"Unable to get root view controller");
        [RazorpayEventEmitter onPaymentError:-1 description:@"Unable to get root view controller" andData:@{}];
        return;
    }
    
    UIViewController *presentingController = rootViewController.presentedViewController ?: rootViewController;
    NSLog(@"Opening Razorpay checkout with controller: %@", presentingController);
    [razorpay open:mutableOptions displayController:presentingController];
}

// MARK: - Razorpay Delegates
- (void)onPaymentSuccess:(NSString *)payment_id andData:(NSDictionary *)response {
    NSLog(@"onPaymentSuccess: %@, response: %@", payment_id, response);
    [RazorpayEventEmitter onPaymentSuccess:payment_id andData:response];
}

- (void)onPaymentError:(int32_t)code description:(NSString *)str andData:(NSDictionary *)response {
    NSLog(@"onPaymentError: %d, description: %@, response: %@", code, str, response);
    [RazorpayEventEmitter onPaymentError:code description:str andData:response];
}

- (void)onExternalWalletSelected:(NSString *)walletName withPaymentData:(NSDictionary *)paymentData {
    NSLog(@"onExternalWalletSelected: %@, paymentData: %@", walletName, paymentData);
    [RazorpayEventEmitter onExternalWalletSelected:walletName andData:paymentData];
}

@end
