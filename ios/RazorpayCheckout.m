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

// Import Turbo if header is available
#if __has_include(<TurboUpiPluginUI/TurboUpiPluginUI-Swift.h>)
    #define HAS_TURBO_UPI_PLUGIN 1
    #import <TurboUpiPluginUI/TurboUpiPluginUI-Swift.h>
#else
    #define HAS_TURBO_UPI_PLUGIN 0
#endif

typedef RazorpayCheckout Razorpay;

#if HAS_TURBO_UPI_PLUGIN
@class RNRazorpayCheckout;

// Internal TurboSessionDelegate implementation
@interface RNTurboSessionBridge : NSObject
@property (nonatomic, weak) RNRazorpayCheckout *razorpayInstance;
- (instancetype)initWithRazorpayInstance:(RNRazorpayCheckout *)instance;
- (void)requestSessionToken:(void (^)(NSString *token, NSError *error))completion;
@end
#endif

@interface RNRazorpayCheckout () <RazorpayPaymentCompletionProtocolWithData
#if HAS_TURBO_UPI_PLUGIN
, UPITurboResultDelegate
#endif
>

#if HAS_TURBO_UPI_PLUGIN
@property (nonatomic, strong) void (^sessionTokenCallback)(void (^completion)(NSString * _Nonnull));
@property (nonatomic, strong) RNTurboSessionBridge *sessionBridge;
@property (nonatomic, copy) void (^currentTokenCompletion)(NSString *token, NSError *error);

// Internal bridge methods
- (void)triggerTokenRequestFromJS:(void (^)(NSString *token, NSError *error))completion;
#endif

@end

@implementation RNRazorpayCheckout

RCT_EXPORT_MODULE()

#if HAS_TURBO_UPI_PLUGIN
// Initialize the session bridge on first access
- (RNTurboSessionBridge *)sessionBridge {
    if (!_sessionBridge) {
        _sessionBridge = [[RNTurboSessionBridge alloc] initWithRazorpayInstance:self];
    }
    return _sessionBridge;
}

// Method called by internal bridge to trigger JS event
- (void)triggerTokenRequestFromJS:(void (^)(NSString *token, NSError *error))completion {
    NSLog(@"🔄 Triggering token request event to JS layer...");
    
    // Store the completion handler
    self.currentTokenCompletion = completion;
    
    // Emit event to JS
    [RazorpayEventEmitter onTurboSessionTokenRequested];
}

// Method for JS to provide the token back to native
RCT_EXPORT_METHOD(provideSessionToken:(NSString *)token
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    
    NSLog(@"✅ Received session token from JS: %@", token);
    
    if (self.currentTokenCompletion) {
        if (token && token.length > 0) {
            NSLog(@"✅ Providing token to Turbo SDK: %@", token);
            self.currentTokenCompletion(token, nil);
        } else {
            NSLog(@"❌ Invalid token received from JS");
            NSError *error = [NSError errorWithDomain:@"TurboSessionError" 
                                                code:2002 
                                            userInfo:@{NSLocalizedDescriptionKey: @"Invalid token received"}];
            self.currentTokenCompletion(nil, error);
        }
        
        // Clear the completion handler
        self.currentTokenCompletion = nil;
        resolve(@YES);
    } else {
        NSLog(@"❌ No pending token request found");
        reject(@"NO_PENDING_REQUEST", @"No pending token request found", nil);
    }
}
#endif

// Check for Turbo UPI Plugin availability based on header file
RCT_EXPORT_METHOD(isTurboAvailable:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject) {
    BOOL available = [self isTurboUpiPluginAvailable];
    NSLog(@"📤 [TURBO] isTurboAvailable returning: %@", available ? @"YES" : @"NO");
    resolve(@(available));
}

#if HAS_TURBO_UPI_PLUGIN
RCT_EXPORT_METHOD(manageUpiAccounts:(NSString *)mobileNumber
                  color:(NSString *)color
                  razorpayKey:(NSString *)razorpayKey
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    
    dispatch_async(dispatch_get_main_queue(), ^{
        Class turboUPIClass = [self getTurboUpiClass];
        if (!turboUPIClass) {
            reject(@"TURBO_ERROR", @"No suitable Turbo UPI class found", nil);
            return;
        }
        
        id<UPITurboUIPlugin> turboPlugin = [turboUPIClass UIPluginInstance];
        if (!turboPlugin) {
            reject(@"TURBO_ERROR", @"Failed to get turbo plugin instance", nil);
            return;
        }
        
        Razorpay *razorpay = [Razorpay initWithKey:razorpayKey
                                andDelegateWithData:self
                                             plugin:turboPlugin];
        
        [razorpay.upiTurbo initialize:self];
        
        [razorpay.upiTurbo manageUpiAccountWithMobileNumber:mobileNumber
                                                      color:color
                                          completionHandler:^(id result, id error) {
            if (error) {
                reject(@"TURBO_ERROR", @"Manage UPI accounts failed", error);
            } else {
                resolve(result);
            }
        }];
    });
}

RCT_EXPORT_METHOD(initializeTurbo:(NSString *)razorpayKey
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    
    dispatch_async(dispatch_get_main_queue(), ^{
        @try {
            NSLog(@"🔄 Starting Turbo initialization...");
            
            // Step 1: Get Turbo UPI class
            Class turboUPIClass = [self getTurboUpiClass];
            if (!turboUPIClass) {
                NSLog(@"❌ No suitable Turbo UPI class found");
                reject(@"TURBO_INIT_ERROR", @"No suitable Turbo UPI class found", nil);
                return;
            }
            NSLog(@"✅ Turbo UPI class found: %@", NSStringFromClass(turboUPIClass));
            
            // Step 2: Get UIPluginInstance
            if (![turboUPIClass respondsToSelector:@selector(UIPluginInstance)]) {
                NSLog(@"❌ UIPluginInstance method not found on %@", NSStringFromClass(turboUPIClass));
                reject(@"TURBO_INIT_ERROR", @"UIPluginInstance method not found", nil);
                return;
            }
            NSLog(@"✅ UIPluginInstance method found");
            
            id<UPITurboUIPlugin> turboPlugin = [turboUPIClass UIPluginInstance];
            if (!turboPlugin) {
                NSLog(@"❌ Failed to get turbo plugin instance");
                reject(@"TURBO_INIT_ERROR", @"Failed to get turbo plugin instance", nil);
                return;
            }
            NSLog(@"✅ Turbo plugin instance created");
            
            // Step 3: Initialize Razorpay with plugin
            Razorpay *razorpay = [Razorpay initWithKey:razorpayKey
                                    andDelegateWithData:self
                                                 plugin:turboPlugin];
            if (!razorpay) {
                NSLog(@"❌ Failed to initialize Razorpay with turbo plugin");
                reject(@"TURBO_INIT_ERROR", @"Failed to initialize Razorpay with turbo plugin", nil);
                return;
            }
            NSLog(@"✅ Razorpay initialized with turbo plugin");
            
            // Step 4: Initialize upiTurbo
            if (!razorpay.upiTurbo) {
                NSLog(@"❌ razorpay.upiTurbo is nil");
                reject(@"TURBO_INIT_ERROR", @"razorpay.upiTurbo is nil", nil);
                return;
            }
            NSLog(@"✅ razorpay.upiTurbo is available");
            
            [razorpay.upiTurbo initialize:self];
            NSLog(@"✅ Turbo initialization completed successfully");
            
            resolve(@YES);
        } @catch (NSException *exception) {
            NSLog(@"❌ Exception during turbo initialization: %@", exception.reason);
            reject(@"TURBO_INIT_ERROR", exception.reason, nil);
        }
    });
}

RCT_EXPORT_METHOD(setTurboSessionCallback:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    
    // Store a callback that will be triggered when token is needed
    self.sessionTokenCallback = ^(void (^completion)(NSString * _Nonnull)) {
        NSLog(@"🔄 Token requested by Turbo - bridging to JS...");
        
        // Use internal bridge to request token from JS
        [self.sessionBridge requestSessionToken:^(NSString *token, NSError *error) {
            if (token && !error) {
                NSLog(@"✅ Token received from JS bridge, passing to Turbo: %@", token);
                completion(token);
            } else {
                NSLog(@"❌ Failed to get token from JS bridge: %@", error.localizedDescription);
                // Still call completion with nil to avoid hanging
                completion(nil);
            }
        }];
    };
    
    resolve(@YES);
}

RCT_EXPORT_METHOD(testTokenBridge:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    
    NSLog(@"🧪 Testing internal token bridge to JS...");
    
    [self.sessionBridge requestSessionToken:^(NSString *token, NSError *error) {
        if (token && !error) {
            NSLog(@"✅ Token bridge test successful: %@", token);
            resolve(@{@"success": @YES, @"token": token});
        } else {
            NSLog(@"❌ Token bridge test failed: %@", error ? error.localizedDescription : @"Unknown error");
            reject(@"TOKEN_BRIDGE_ERROR", error ? error.localizedDescription : @"Unknown error", error);
        }
    }];
}
#endif

RCT_EXPORT_METHOD(open : (NSDictionary *)options) {

    NSString *keyID = (NSString *)[options objectForKey:@"key"];
    dispatch_sync(dispatch_get_main_queue(), ^{
        
#if HAS_TURBO_UPI_PLUGIN
        // Check if Turbo should be enabled
        BOOL turboEnabled = [self isTurboUpiPluginAvailable];
        
        Razorpay *razorpay;
        if (turboEnabled) {
            NSLog(@"🔄 Initializing Razorpay with Turbo plugin for payment...");
            
            // Initialize with Turbo plugin
            Class turboUPIClass = [self getTurboUpiClass];
            if (!turboUPIClass) {
                NSLog(@"❌ No suitable Turbo UPI class found in open method");
                // Fallback to regular initialization
                razorpay = [Razorpay initWithKey:keyID andDelegateWithData:self];
            } else {
                id<UPITurboUIPlugin> turboPlugin = [turboUPIClass UIPluginInstance];
                if (!turboPlugin) {
                    NSLog(@"❌ Failed to get turbo plugin instance in open method");
                    // Fallback to regular initialization
                    razorpay = [Razorpay initWithKey:keyID andDelegateWithData:self];
                } else {
                    NSLog(@"✅ Turbo plugin instance obtained for payment");
                    razorpay = [Razorpay initWithKey:keyID
                                 andDelegateWithData:self
                                              plugin:turboPlugin];
                    
                    // Initialize Turbo plugin
                    if (razorpay.upiTurbo) {
                        [razorpay.upiTurbo initialize:self];
                        NSLog(@"✅ Turbo plugin initialized for payment");
                    } else {
                        NSLog(@"❌ razorpay.upiTurbo is nil in open method");
                    }
                }
            }
        } else {
            NSLog(@"🔄 Initializing Razorpay without Turbo plugin");
            razorpay = [Razorpay initWithKey:keyID
                         andDelegateWithData:self];
        }
#else
        Razorpay *razorpay = [Razorpay initWithKey:keyID
                               andDelegateWithData:self];
#endif
        
        NSMutableDictionary * tempOptions = [[NSMutableDictionary alloc] initWithDictionary:options];
        tempOptions[@"integration"] = @"react_native";
        tempOptions[@"FRAMEWORK"] = @"react_native";

        //get root view to present razorpay vc
        id<UIApplicationDelegate> app = [[UIApplication sharedApplication] delegate];
        UINavigationController *rootViewController = ((UINavigationController*) app.window.rootViewController);

#if HAS_TURBO_UPI_PLUGIN
        if (turboEnabled) {
            // Use Turbo payment plugin
            NSLog(@"🔄 Getting turbo UI payment plugin...");
            
            Class turboUPIClass = [self getTurboUpiClass];
            if (!turboUPIClass) {
                NSLog(@"❌ No suitable Turbo UPI class found for payment plugin");
                // Fallback to regular payment
                if (rootViewController.presentedViewController) {
                    [razorpay open:tempOptions displayController:rootViewController.presentedViewController];
                    return;
                }
                [razorpay open:tempOptions displayController:rootViewController];
                return;
            }
            
            if (![turboUPIClass respondsToSelector:@selector(turboUIPaymentPlugin)]) {
                NSLog(@"❌ turboUIPaymentPlugin method not found on %@", NSStringFromClass(turboUPIClass));
                // Fallback to regular payment
                if (rootViewController.presentedViewController) {
                    [razorpay open:tempOptions displayController:rootViewController.presentedViewController];
                    return;
                }
                [razorpay open:tempOptions displayController:rootViewController];
                return;
            }
            
            id turboUIPlugin = [turboUPIClass turboUIPaymentPlugin];
            if (!turboUIPlugin) {
                NSLog(@"❌ Failed to get turboUIPaymentPlugin instance");
                // Fallback to regular payment
                if (rootViewController.presentedViewController) {
                    [razorpay open:tempOptions displayController:rootViewController.presentedViewController];
                    return;
                }
                [razorpay open:tempOptions displayController:rootViewController];
                return;
            }
            
            NSLog(@"✅ Turbo UI payment plugin obtained");
            NSArray *externalPaymentEntities = @[turboUIPlugin];
            
            if (rootViewController.presentedViewController) {
                [razorpay open:tempOptions displayController:rootViewController.presentedViewController arrExternalPaymentEntities:externalPaymentEntities];
                return;
            }
            
            [razorpay open:tempOptions arrExternalPaymentEntities:externalPaymentEntities];
        } else {
#endif
            if (rootViewController.presentedViewController) {
                [razorpay open:tempOptions displayController:rootViewController.presentedViewController];
                return;
            }

            [razorpay open:tempOptions displayController:rootViewController];
#if HAS_TURBO_UPI_PLUGIN
        }
#endif
    });
}



- (void)onPaymentSuccess:(nonnull NSString *)payment_id
                 andData:(nullable NSDictionary *)response {
    [RazorpayEventEmitter onPaymentSuccess:payment_id andData:response];
}

- (void)onPaymentError:(int)code
           description:(nonnull NSString *)str
               andData:(nullable NSDictionary *)response {
    [RazorpayEventEmitter onPaymentError:code description:str andData:response];
}

#pragma mark - Turbo Support

// Helper method to get the correct Turbo UPI class
- (Class)getTurboUpiClass {
    Class rzpTurboUPIClass = NSClassFromString(@"RZPTurboUPI");
    Class turboUPIClass = NSClassFromString(@"TurboUpiPluginUI.RZPTurboUPI");
    Class turboUIClass = NSClassFromString(@"TurboUpiPluginUI.TurboUPI");
    
    return rzpTurboUPIClass ?: turboUPIClass ?: turboUIClass;
}

// Check for Turbo UPI Plugin availability using runtime class check
- (BOOL)isTurboUpiPluginAvailable {
    // Check for essential classes
    Class upiAccountClass = NSClassFromString(@"TurboUpiPluginUI.UpiAccount");
    Class targetClass = [self getTurboUpiClass];
    
    BOOL upiAccountAvailable = (upiAccountClass != nil);
    NSLog(@"⚡ TurboUpiPluginUI.UpiAccount class: %@", upiAccountAvailable ? @"✅ Found" : @"❌ Not found");
    
    if (targetClass) {
        NSLog(@"⚡ Using Turbo class: %@", NSStringFromClass(targetClass));
        
        BOOL hasUIPluginInstance = [targetClass respondsToSelector:@selector(UIPluginInstance)];
        BOOL hasTurboUIPaymentPlugin = [targetClass respondsToSelector:@selector(turboUIPaymentPlugin)];
        
        NSLog(@"⚡ %@.UIPluginInstance method: %@", NSStringFromClass(targetClass), hasUIPluginInstance ? @"✅ Available" : @"❌ Not available");
        NSLog(@"⚡ %@.turboUIPaymentPlugin method: %@", NSStringFromClass(targetClass), hasTurboUIPaymentPlugin ? @"✅ Available" : @"❌ Not available");
        
        BOOL available = upiAccountAvailable && hasUIPluginInstance && hasTurboUIPaymentPlugin;
        
        if (available) {
            NSLog(@"⚡ All Turbo components verified - Turbo fully available");
        } else {
            NSLog(@"⚡ Some Turbo components missing - Turbo unavailable");
        }
        
        return available;
    } else {
        NSLog(@"⚡ No suitable Turbo UPI class found - Turbo unavailable");
        return NO;
    }
}



#if HAS_TURBO_UPI_PLUGIN
// UPITurboResultDelegate methods can be added here if needed
#endif

@end

#if HAS_TURBO_UPI_PLUGIN
// Implementation of the internal bridge
@implementation RNTurboSessionBridge

- (instancetype)initWithRazorpayInstance:(RNRazorpayCheckout *)instance {
    self = [super init];
    if (self) {
        self.razorpayInstance = instance;
    }
    return self;
}

- (void)requestSessionToken:(void (^)(NSString *token, NSError *error))completion {
    NSLog(@"🔄 Internal bridge requesting session token from JS...");
    
    if (!self.razorpayInstance) {
        NSLog(@"❌ RazorpayCheckout instance is nil");
        NSError *error = [NSError errorWithDomain:@"TurboSessionError" 
                                            code:2001 
                                        userInfo:@{NSLocalizedDescriptionKey: @"RazorpayCheckout instance is nil"}];
        completion(nil, error);
        return;
    }
    
    // Trigger JS event to request token from merchant
    [self.razorpayInstance triggerTokenRequestFromJS:completion];
}

@end
#endif
