#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

@interface RCT_EXTERN_MODULE(RazorpayTurboModule, RCTEventEmitter)

RCT_EXTERN_METHOD(open:(NSDictionary *)options)

// Event emitter methods
RCT_EXTERN_METHOD(addListener:(NSString *)eventName)
RCT_EXTERN_METHOD(removeListeners:(NSNumber *)count)

@end