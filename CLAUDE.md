# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a React Native wrapper around Razorpay's native Android and iOS payment SDKs. It exposes the native checkout functionality to React Native applications through a JavaScript bridge, allowing React Native apps to integrate Razorpay payment processing.

## Architecture

### Three-Layer Bridge Architecture

The codebase follows a three-layer bridge pattern connecting JavaScript to native code:

1. **JavaScript Layer** (`RazorpayCheckout.js`)
   - Exposes `RazorpayCheckout.open()` method returning a Promise
   - Listens to native events via `NativeEventEmitter` for payment callbacks
   - Events: `PAYMENT_SUCCESS`, `PAYMENT_ERROR`, `EXTERNAL_WALLET_SELECTED`
   - Handles event cleanup via `removeSubscriptions()`

2. **Native Bridge Layer**
   - **iOS** (`ios/RazorpayCheckout.m`, `ios/RazorpayEventEmitter.m`)
     - `RNRazorpayCheckout`: Exported module that calls native Razorpay SDK
     - `RazorpayEventEmitter`: RCTEventEmitter subclass using NSNotificationCenter
     - Imports Razorpay framework via `@import RazorpayCore`
   - **Android** (`android/src/main/java/com/razorpay/rn/`)
     - `RazorpayModule`: ReactContextBaseJavaModule handling checkout via intents
     - Implements `PaymentResultWithDataListener` and `ExternalWalletListener`
     - Uses `Utils.java` for bidirectional React Native ↔ JSON conversion

3. **Native SDKs**
   - **iOS**: Razorpay Swift framework (via CocoaPods, version 1.5.0)
   - **Android**: `com.razorpay:standard-core:1.7.1` (via Gradle)

### Event Flow

Payment flow: JS calls `open()` → Native module starts activity/presents VC → User completes payment → Native SDK callbacks → Event emitter → JS Promise resolves/rejects

## Platform-Specific Code

### iOS (`ios/`)
- Uses Objective-C with Swift framework imports
- Presents checkout on `rootViewController` or `presentedViewController`
- Event propagation: Razorpay delegate → NSNotification → RCTEventEmitter → JS
- Podspec dependency: `razorpay-pod` version 1.5.0

### Android (`android/`)
- Native module registered via `RazorpayPackage`
- Launches `CheckoutActivity` via intent with `OPTIONS` JSON payload
- Result handling via `ActivityEventListener` and `onActivityResult`
- Gradle dependency: `com.razorpay:standard-core:1.7.1`
- Minimum SDK: 16, Target SDK: 28

## Key Files

- `RazorpayCheckout.js`: Main JS API, event listeners, Promise-based interface
- `ios/RazorpayCheckout.m`: iOS native module implementing payment delegates
- `ios/RazorpayEventEmitter.m`: iOS event emitter using NSNotificationCenter
- `android/src/main/java/com/razorpay/rn/RazorpayModule.java`: Android native module
- `android/src/main/java/com/razorpay/rn/Utils.java`: Conversion utilities for ReadableMap ↔ JSONObject
- `react-native-razorpay.podspec`: CocoaPods specification
- `android/build.gradle`: Android library configuration

## Development

### Testing Changes

Use the example app located at `example/SampleApp/` to test modifications:

```bash
cd example/SampleApp
npm install

# iOS
cd ios && pod install && cd ..
npx react-native run-ios

# Android
npx react-native run-android
```

### Making Changes to the Module

When modifying the native modules:
1. Delete the `postinstall` step from `package.json` (remember to revert before committing)
2. Edit and configure `example/reload.sh` with your local path
3. Run `example/reload.sh` after each change to reload the module

### iOS Linking Requirements

For iOS development, ensure:
- Minimum iOS version is 10.0+ in Podfile
- Run `pod install` in the iOS directory
- Framework is set to "Embed & Sign" in Xcode project settings
- "Always Embed Swift Standard Binaries" is set to YES in build settings

## Release Process

Releases are semi-automated via `Scripts/UpdateReactCheckout.sh`:

1. Run the script and provide:
   - Path to react-native checkout directory
   - Latest iOS framework version
   - New react-native package version
2. Script automatically:
   - Creates release branch `r/v{version}`
   - Downloads and updates iOS framework from S3
   - Updates `package.json` version
   - Commits, pushes, creates PR, and tags the release
3. After PR merge, run `npm publish` to release

## Version Compatibility

- React: >= 16.8.0
- React Native: >= 0.66.0
- iOS: 10.0+
- Android: minSdk 16, targetSdk 28
- Xcode: 11+
- Swift: 5.1+

## Proguard Configuration

For Android builds using Proguard, the following rules must be included:

```
-keepattributes *Annotation*
-dontwarn com.razorpay.**
-keep class com.razorpay.** {*;}
-optimizations !method/inlining/
-keepclasseswithmembers class * {
  public void onPayment*(...);
}
```

## Platform-Specific Notes

### iOS UPI Intent Support
For UPI apps to appear in iOS, add to `Info.plist`:
```xml
<key>LSApplicationQueriesSchemes</key>
<array>
  <string>tez</string>
  <string>phonepe</string>
  <string>paytmmp</string>
</array>
```

For Expo apps, add this to `app.json` instead of modifying Info.plist directly.

### Expo Applications
After installing the package, prebuild is required:
```bash
npx expo prebuild
npx expo run:ios --device
# or
npx expo run:android --device
```

## Important Implementation Details

- The JS module uses event listeners that must be cleaned up via `removeSubscriptions()` after payment completion
- Both success and error callbacks remove all listeners to prevent memory leaks
- Native modules must dispatch events on the correct thread (main queue for iOS, UI thread for Android)
- The `Utils.java` class handles type-safe conversion between React Native's ReadableMap/WritableMap and Android JSONObject
- iOS implementation uses NSNotificationCenter as an intermediary between Razorpay delegates and RCTEventEmitter

## New Architecture Support (TurboModules)

### Overview
Starting from version 2.3.1, react-native-razorpay supports both React Native's legacy bridge architecture and the new TurboModule architecture. The library automatically detects which architecture is being used and adapts accordingly with **zero configuration required** from developers.

### Architecture Detection
- **Runtime Detection**: The JavaScript layer checks `global.__turboModuleProxy` to detect new architecture
- **Automatic Fallback**: If TurboModule registration fails, gracefully falls back to NativeModules
- **Build-time Selection**: Native code uses conditional compilation (`RCT_NEW_ARCH_ENABLED` for iOS, `newArchEnabled` for Android)

### Dual Architecture Pattern

**JavaScript Layer** (`RazorpayCheckout.js`):
- Auto-detects architecture at runtime
- Loads TurboModule specs for new arch, falls back to NativeModules for old arch
- Single API surface - no code changes needed for consumers

**iOS Native**:
- Conditional protocol conformance: `RCTBridgeModule` for old arch, `NativeRazorpayCheckoutSpec` for new arch
- Uses `#ifdef RCT_NEW_ARCH_ENABLED` preprocessor directives
- Maintains NSNotificationCenter pattern (works in both architectures)
- Podspec conditionally includes Codegen dependencies when `RCT_NEW_ARCH_ENABLED=1`

**Android Native**:
- Shared implementation pattern: `RazorpayModuleImpl.java` contains all business logic
- Dual source sets: `src/newarch/` for TurboModule wrapper, `src/oldarch/` for bridge wrapper
- Both wrappers delegate to shared `RazorpayModuleImpl`
- Codegen generates TurboModule spec classes when `newArchEnabled=true`
- Build.gradle conditionally loads correct source set and configures codegen

### Event Emitter Compatibility
The event system works identically in both architectures:
- **iOS**: NSNotificationCenter → RCTEventEmitter → JavaScript
- **Android**: DeviceEventManagerModule.RCTDeviceEventEmitter → JavaScript
- Events: `PAYMENT_SUCCESS`, `PAYMENT_ERROR`, `EXTERNAL_WALLET_SELECTED`

### Testing Both Architectures

**Test Old Architecture:**
```bash
# Android
cd example/SampleApp
# Set newArchEnabled=false in android/gradle.properties
./gradlew clean
npm run android

# iOS
cd ios
RCT_NEW_ARCH_ENABLED=0 pod install
cd ..
npm run ios
```

**Test New Architecture:**
```bash
# Android
cd example/SampleApp
# Set newArchEnabled=true in android/gradle.properties
./gradlew clean
npm run android

# iOS
cd ios
RCT_NEW_ARCH_ENABLED=1 pod install
cd ..
npm run ios
```

### Version Compatibility
- **React Native**: >=0.66.0 (old architecture), >=0.71.0 recommended for new architecture
- **React**: >=16.8.0
- Backward compatible - existing apps continue working without changes
