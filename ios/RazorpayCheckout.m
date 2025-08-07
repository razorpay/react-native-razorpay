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

// Import the automatically generated Swift bridging header for Turbo builds
#ifdef RAZORPAY_TURBO_ENABLED
    #if __has_include("react_native_razorpay-Swift.h")
        #import "react_native_razorpay-Swift.h"
    #endif
#endif

typedef RazorpayCheckout Razorpay;

// Forward declarations for Swift interop (fallback if bridging header not found)
#ifdef RAZORPAY_TURBO_ENABLED
@class RazorpayTurboManager;
@protocol RazorpayTurboManagerDelegate;

@interface RNRazorpayCheckout () <RazorpayPaymentCompletionProtocolWithData, RazorpayTurboManagerDelegate>

// Turbo manager for handling Turbo-specific functionality
@property (nonatomic, strong) RazorpayTurboManager *turboManager;

@end
#else
@interface RNRazorpayCheckout () <RazorpayPaymentCompletionProtocolWithData>

@end
#endif

@implementation RNRazorpayCheckout

RCT_EXPORT_MODULE()

#pragma mark - Initialization

- (instancetype)init {
    self = [super init];
    if (self) {
#ifdef RAZORPAY_TURBO_ENABLED
        // Initialize Turbo manager and set delegate only for Turbo builds
        self.turboManager = [[RazorpayTurboManager alloc] init];
        self.turboManager.delegate = self;
        NSLog(@"🔄 Turbo manager initialized");
#else
        NSLog(@"🔄 Standard build - no Turbo manager");
#endif
    }
    return self;
}

#pragma mark - Core Payment Method

RCT_EXPORT_METHOD(open : (NSDictionary *)options) {
    NSString *keyID = (NSString *)[options objectForKey:@"key"];
    
    dispatch_sync(dispatch_get_main_queue(), ^{
        [self openPaymentWithOptions:options keyID:keyID];
    });
}

- (void)openPaymentWithOptions:(NSDictionary *)options keyID:(NSString *)keyID {
    NSMutableDictionary *tempOptions = [[NSMutableDictionary alloc] initWithDictionary:options];
    tempOptions[@"integration"] = @"react_native";
    tempOptions[@"FRAMEWORK"] = @"react_native";
    
    // Get root view controller
    id<UIApplicationDelegate> app = [[UIApplication sharedApplication] delegate];
    UINavigationController *rootViewController = ((UINavigationController*) app.window.rootViewController);
    
    Razorpay *razorpay;
    
#ifdef RAZORPAY_TURBO_ENABLED
    // Check Turbo availability through Swift manager
    BOOL turboAvailable = [self.turboManager isTurboAvailable];
    
    if (turboAvailable) {
        NSLog(@"🔄 Initializing Razorpay with Turbo plugin");
        // Use Swift manager to initialize Razorpay directly
        razorpay = (Razorpay *)[self.turboManager initializeRazorpayWithKey:keyID];
        
        if (razorpay) {
            // Get Turbo payment plugin from Swift manager
            id turboUIPlugin = [self.turboManager getTurboPaymentPlugin];
            
            if (turboUIPlugin) {
                NSLog(@"✅ Using Turbo UI payment plugin");
                NSArray *externalPaymentEntities = @[turboUIPlugin];
                
                if (rootViewController.presentedViewController) {
                    [razorpay open:tempOptions
                   displayController:rootViewController.presentedViewController
         arrExternalPaymentEntities:externalPaymentEntities];
                } else {
                    [razorpay open:tempOptions arrExternalPaymentEntities:externalPaymentEntities];
                }
                return;
            } else {
                NSLog(@"❌ Failed to get Turbo UI payment plugin, falling back to standard");
            }
        } else {
            NSLog(@"❌ Failed to initialize Razorpay with Turbo, falling back to standard");
        }
    } else {
        NSLog(@"🔄 Turbo not available, using standard initialization");
    }
    
    // Fallback to standard initialization
    if (!razorpay) {
        razorpay = [Razorpay initWithKey:keyID andDelegateWithData:self];
    }
#else
    // Standard build - always use standard initialization
    NSLog(@"🔄 Standard build - initializing Razorpay without Turbo");
    razorpay = [Razorpay initWithKey:keyID andDelegateWithData:self];
#endif
    
    // Standard payment flow
    if (rootViewController.presentedViewController) {
        [razorpay open:tempOptions displayController:rootViewController.presentedViewController];
    } else {
        [razorpay open:tempOptions displayController:rootViewController];
    }
}

#pragma mark - Core Payment Delegates

- (void)onPaymentSuccess:(nonnull NSString *)payment_id
                 andData:(nullable NSDictionary *)response {
    [RazorpayEventEmitter onPaymentSuccess:payment_id andData:response];
}

- (void)onPaymentError:(int)code
           description:(nonnull NSString *)str
               andData:(nullable NSDictionary *)response {
    [RazorpayEventEmitter onPaymentError:code description:str andData:response];
}

#ifdef RAZORPAY_TURBO_ENABLED

#pragma mark - Turbo Methods (Only available in Turbo builds)

// Check for Turbo UPI Plugin availability - delegates to Swift manager
RCT_EXPORT_METHOD(isTurboAvailable:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject) {
    BOOL available = [self.turboManager isTurboAvailable];
    NSLog(@"📤 [TURBO] isTurboAvailable returning: %@", available ? @"YES" : @"NO");
    resolve(@(available));
}

RCT_EXPORT_METHOD(manageUpiAccounts:(NSString *)mobileNumber
                  color:(NSString *)color
                  razorpayKey:(NSString *)razorpayKey
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    
    NSLog(@"🔄 Managing UPI accounts via Swift Turbo manager");
    
    [self.turboManager manageUpiAccountsWithMobileNumber:mobileNumber
                                                   color:color
                                              completion:^(BOOL success, NSError *error) {
        if (success) {
            resolve(@YES);
        } else {
            reject(@"TURBO_ERROR", error.localizedDescription, error);
        }
    }];
}

RCT_EXPORT_METHOD(initializeTurbo:(NSString *)razorpayKey
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    
    NSLog(@"🔄 Initializing Turbo via Swift manager");
    
    // Use the simplified Swift manager to initialize Razorpay directly
    id razorpayInstance = [self.turboManager initializeRazorpayWithKey:razorpayKey];
    
    if (razorpayInstance) {
        resolve(@YES);
    } else {
        reject(@"TURBO_INIT_ERROR", @"Failed to initialize Razorpay with Turbo", nil);
    }
}

RCT_EXPORT_METHOD(setTurboSessionCallback:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    
    NSLog(@"🔄 Session callback setup - Swift manager handles this automatically");
    
    // The Swift manager automatically handles session callbacks via TurboSessionDelegate
    // No explicit setup needed - just return success
    resolve(@YES);
}

RCT_EXPORT_METHOD(provideSessionToken:(NSString *)token
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    
    NSLog(@"✅ Received session token from JS: %@", token);
    
    if (token && token.length > 0) {
        // Provide the token directly to the Swift manager
        [self.turboManager provideSessionToken:token];
        resolve(@YES);
    } else {
        NSLog(@"❌ Invalid token received from JS");
        reject(@"INVALID_TOKEN", @"Invalid token received", nil);
    }
}

#pragma mark - RazorpayTurboManagerDelegate

- (void)onPaymentSuccess:(NSString *)paymentId data:(NSDictionary *)data {
    [RazorpayEventEmitter onPaymentSuccess:paymentId andData:data];
}

- (void)onPaymentError:(int)code description:(NSString *)description data:(NSDictionary *)data {
    [RazorpayEventEmitter onPaymentError:code description:description andData:data];
}

- (void)onTurboSessionTokenRequested {
    NSLog(@"🔄 Token requested by Swift Turbo manager - emitting event to JS layer...");
    
    // Emit event to JS - the provideSessionToken method will handle the response
    [RazorpayEventEmitter onTurboSessionTokenRequested];
}

#else

#pragma mark - Turbo Stubs (Standard builds return unavailable)

RCT_EXPORT_METHOD(isTurboAvailable:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject) {
    NSLog(@"📤 [STANDARD] isTurboAvailable returning: NO (Standard build)");
    resolve(@NO);
}

RCT_EXPORT_METHOD(manageUpiAccounts:(NSString *)mobileNumber
                  color:(NSString *)color
                  razorpayKey:(NSString *)razorpayKey
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    reject(@"TURBO_UNAVAILABLE", @"Turbo functionality not available in Standard Bridge", nil);
}

RCT_EXPORT_METHOD(initializeTurbo:(NSString *)razorpayKey
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    reject(@"TURBO_UNAVAILABLE", @"Turbo functionality not available in Standard Bridge", nil);
}

RCT_EXPORT_METHOD(setTurboSessionCallback:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    reject(@"TURBO_UNAVAILABLE", @"Turbo functionality not available in Standard Bridge", nil);
}

RCT_EXPORT_METHOD(provideSessionToken:(NSString *)token
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    reject(@"TURBO_UNAVAILABLE", @"Turbo functionality not available in Standard Bridge", nil);
}

#endif // RAZORPAY_TURBO_ENABLED

@end
