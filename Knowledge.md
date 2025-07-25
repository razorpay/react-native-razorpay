# React Native Razorpay - Complete Knowledge Transfer

## Overview

The `react-native-razorpay` is a comprehensive React Native wrapper around Razorpay's native Android and iOS SDKs, enabling seamless payment integration in React Native applications. This document provides a complete architectural overview and understanding of how every component works together.

## Table of Contents

1. [High-Level Architecture](#high-level-architecture)
2. [Core Components](#core-components)
3. [Platform-Specific Implementations](#platform-specific-implementations)
4. [Data Flow and Communication](#data-flow-and-communication)
5. [Integration Points](#integration-points)
6. [File Structure Analysis](#file-structure-analysis)
7. [Payment Flow Walkthrough](#payment-flow-walkthrough)
8. [Event System](#event-system)
9. [Error Handling](#error-handling)
10. [Configuration and Setup](#configuration-and-setup)
11. [Example Implementation](#example-implementation)
12. [Troubleshooting and Common Issues](#troubleshooting-and-common-issues)

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    React Native App Layer                      │
├─────────────────────────────────────────────────────────────────┤
│                  RazorpayCheckout.js                          │
│            (JavaScript Bridge Interface)                       │
├─────────────────────────────────────────────────────────────────┤
│     React Native Bridge (NativeModules & NativeEventEmitter)   │
├─────────────────────────────────────────────────────────────────┤
│           iOS Implementation        │      Android Implementation│
│        ┌─────────────────────┐      │    ┌─────────────────────┐  │
│        │ RazorpayCheckout.m  │      │    │  RazorpayModule.java│  │
│        │ RazorpayEventEmitter│      │    │  RazorpayPackage    │  │
│        └─────────────────────┘      │    │  Utils.java         │  │
│                                     │    └─────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│           Razorpay Native SDKs                                  │
│      iOS: razorpay-pod          │    Android: checkout:1.6.+    │
└─────────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. JavaScript Interface Layer

**File: `RazorpayCheckout.js`**

This is the main entry point that React Native developers interact with. It provides:

- **Promise-based API**: All operations return JavaScript Promises
- **Event Management**: Handles native event subscriptions and cleanup
- **Method Exposure**: Exposes `open()` and `onExternalWalletSelection()` methods

**Key Features:**
```javascript
class RazorpayCheckout {
  static open(options, successCallback, errorCallback)
  static onExternalWalletSelection(externalWalletCallback)
}
```

**Event Handling:**
- Listens to three key events: `PAYMENT_SUCCESS`, `PAYMENT_ERROR`, `EXTERNAL_WALLET_SELECTED`
- Automatically cleans up event subscriptions after payment completion
- Supports both Promise and callback patterns

### 2. Native Module Bridge

The wrapper uses React Native's `NativeModules` system to communicate with platform-specific code:

- **iOS**: `RNRazorpayCheckout` module
- **Android**: `RNRazorpayCheckout` module

## Platform-Specific Implementations

### iOS Implementation

#### Files Structure:
```
ios/
├── RazorpayCheckout.h           # Header for main iOS module
├── RazorpayCheckout.m           # Main iOS implementation
├── RazorpayEventEmitter.h       # Event emitter header
├── RazorpayEventEmitter.m       # Event emitter implementation
├── react-native-razorpay.podspec # CocoaPods specification
└── SelectDefaultXcode.sh        # Xcode setup script
```

#### Key Components:

**1. RazorpayCheckout.m**
- Implements `RazorpayPaymentCompletionProtocolWithData` and `ExternalWalletSelectionProtocol`
- Handles payment initialization with Razorpay iOS SDK
- Manages UI presentation on main thread
- Adds integration metadata (`integration: "react_native"`)

**2. RazorpayEventEmitter.m**
- Extends `RCTEventEmitter` for event broadcasting
- Uses `NSNotificationCenter` for internal communication
- Supports three event types: SUCCESS, ERROR, EXTERNAL_WALLET
- Formats payment data for JavaScript consumption

#### iOS Dependencies:
```ruby
s.dependency 'React'
s.dependency 'razorpay-pod'  # Official Razorpay iOS SDK
```

### Android Implementation

#### Files Structure:
```
android/
├── build.gradle                 # Android build configuration
├── src/main/
│   ├── AndroidManifest.xml      # Manifest with CheckoutActivity
│   └── java/com/razorpay/rn/
│       ├── RazorpayModule.java  # Main Android module
│       ├── RazorpayPackage.java # React Native package definition
│       └── Utils.java           # JSON conversion utilities
```

#### Key Components:

**1. RazorpayModule.java**
- Implements `PaymentResultWithDataListener` and `ExternalWalletListener`
- Handles activity result processing
- Manages payment flow through `CheckoutActivity`
- Converts between React Native and JSON data formats

**2. RazorpayPackage.java**
- Registers the native module with React Native
- Required for React Native's auto-linking system

**3. Utils.java**
- Provides bidirectional conversion between:
  - `ReadableMap` ↔ `JSONObject`
  - `ReadableArray` ↔ `JSONArray`
  - `WritableMap` ↔ `JSONObject`

#### Android Dependencies:
```gradle
implementation 'com.facebook.react:react-native:+'
implementation 'com.razorpay:checkout:1.6.+'  # Official Razorpay Android SDK
```

## Data Flow and Communication

### 1. Payment Initiation Flow

```
React Native App
    ↓ (calls RazorpayCheckout.open(options))
RazorpayCheckout.js
    ↓ (subscribes to events & calls native)
React Native Bridge
    ↓
Platform-Specific Module (iOS/Android)
    ↓ (initializes SDK & presents UI)
Razorpay Native SDK
    ↓ (handles payment processing)
Payment Gateway / Banks
```

### 2. Response Flow

```
Payment Result (Success/Error/Wallet)
    ↓
Razorpay Native SDK
    ↓ (callback to platform module)
Platform-Specific Module
    ↓ (emits event via bridge)
React Native Bridge
    ↓ (event emitted)
RazorpayCheckout.js
    ↓ (resolves/rejects Promise)
React Native App (success/error callback)
```

### 3. Event System Architecture

The library uses a sophisticated event system:

**iOS Event Flow:**
```
Payment Result → RazorpayCheckout.m → NSNotificationCenter → RazorpayEventEmitter.m → React Native Bridge → JavaScript
```

**Android Event Flow:**
```
Payment Result → RazorpayModule.java → DeviceEventManagerModule → React Native Bridge → JavaScript
```

## Integration Points

### 1. React Native Integration

The library integrates with React Native through:

- **NativeModules**: For method calls (iOS: `RNRazorpayCheckout`, Android: `RNRazorpayCheckout`)
- **NativeEventEmitter**: For event broadcasting
- **ActivityEventListener**: Android-specific activity lifecycle handling

### 2. Razorpay SDK Integration

**iOS:**
- Uses `Razorpay-Swift.h` import
- Implements required delegate protocols
- Manages view controller presentation

**Android:**
- Uses `com.razorpay.CheckoutActivity`
- Implements listener interfaces
- Handles activity results via `startActivityForResult`

### 3. Build System Integration

**iOS (CocoaPods):**
```ruby
pod 'react-native-razorpay', :path => '../node_modules/react-native-razorpay'
```

**Android (Gradle):**
```gradle
implementation project(':react-native-razorpay')
```

## File Structure Analysis

### Root Level Files

1. **`RazorpayCheckout.js`** - Main JavaScript interface
2. **`package.json`** - NPM package configuration
3. **`react-native-razorpay.podspec`** - iOS CocoaPods specification

### Platform Directories

- **`ios/`** - Complete iOS native implementation
- **`android/`** - Complete Android native implementation
- **`src/`** - Contains example usage (`index.js`)
- **`example/`** - Full sample application

### Configuration Files

- **Android:**
  - `android/build.gradle` - Build configuration and dependencies
  - `android/src/main/AndroidManifest.xml` - Activity declarations

- **iOS:**
  - `react-native-razorpay.podspec` - CocoaPods specification
  - iOS files are directly included in the project

## Payment Flow Walkthrough

### Step-by-Step Payment Process

1. **Initialization**
   ```javascript
   // App calls RazorpayCheckout.open(options)
   RazorpayCheckout.open({
     key: 'rzp_test_key',
     amount: '5000',
     currency: 'INR',
     name: 'Merchant Name',
     // ... other options
   })
   ```

2. **Event Subscription Setup**
   ```javascript
   // RazorpayCheckout.js subscribes to native events
   razorpayEvents.addListener('Razorpay::PAYMENT_SUCCESS', resolve);
   razorpayEvents.addListener('Razorpay::PAYMENT_ERROR', reject);
   ```

3. **Native Module Call**
   ```javascript
   // Calls platform-specific native module
   NativeModules.RNRazorpayCheckout.open(options)
   ```

4. **Platform-Specific Processing**
   
   **iOS:**
   ```objc
   // RazorpayCheckout.m creates and presents Razorpay SDK
   Razorpay *razorpay = [Razorpay initWithKey:keyID andDelegateWithData:self];
   [razorpay open:tempOptions displayController:rootViewController];
   ```
   
   **Android:**
   ```java
   // RazorpayModule.java starts CheckoutActivity
   Intent intent = new Intent(currentActivity, CheckoutActivity.class);
   intent.putExtra("OPTIONS", optionsJSON.toString());
   currentActivity.startActivityForResult(intent, Checkout.RZP_REQUEST_CODE);
   ```

5. **Payment Processing**
   - Razorpay native SDK handles the payment UI
   - User interacts with payment forms, enters details
   - SDK communicates with Razorpay servers

6. **Result Handling**
   
   **Success:**
   ```
   Native SDK → Platform Module → Event Emitter → JavaScript Promise Resolution
   ```
   
   **Error:**
   ```
   Native SDK → Platform Module → Event Emitter → JavaScript Promise Rejection
   ```

7. **Cleanup**
   ```javascript
   // Remove event listeners after payment completion
   removeSubscriptions();
   ```

## Event System

### Event Types

1. **`Razorpay::PAYMENT_SUCCESS`**
   - Triggered on successful payment
   - Contains payment ID and transaction details

2. **`Razorpay::PAYMENT_ERROR`**
   - Triggered on payment failure
   - Contains error code and description

3. **`Razorpay::EXTERNAL_WALLET_SELECTED`**
   - Triggered when user selects external wallet (Paytm, PhonePe, etc.)
   - Contains wallet information

### Event Data Structures

**Success Event:**
```javascript
{
  razorpay_payment_id: "pay_xxxxxxxxxxxxx",
  razorpay_order_id: "order_xxxxxxxxxxxxx",
  razorpay_signature: "signature_string"
}
```

**Error Event:**
```javascript
{
  code: 2,
  description: "Payment cancelled by user",
  details: { /* additional error details */ }
}
```

**External Wallet Event:**
```javascript
{
  external_wallet: "paytm",
  // ... other payment data
}
```

## Error Handling

### Common Error Scenarios

1. **Payment Cancellation**
   - User cancels payment process
   - Returns error with specific cancellation code

2. **Network Issues**
   - Internet connectivity problems
   - Razorpay server issues

3. **Invalid Configuration**
   - Missing or invalid API keys
   - Incorrect payment options

4. **Platform-Specific Errors**
   - iOS: View controller presentation issues
   - Android: Activity result handling problems

### Error Codes and Meanings

The library passes through Razorpay SDK error codes:
- `0`: Payment successful
- `1`: Payment error
- `2`: Network error
- And others as defined by Razorpay SDK

## Configuration and Setup

### NPM Package Configuration

```json
{
  "name": "react-native-razorpay",
  "version": "2.3.0",
  "main": "RazorpayCheckout.js",
  "peerDependencies": {
    "react": ">=16.8.0",
    "react-native": ">=0.66.0"
  }
}
```

### iOS Setup Requirements

1. **Minimum Versions:**
   - iOS 10.0+
   - Xcode 11+
   - Swift 5.1+

2. **Podfile Configuration:**
   ```ruby
   platform :ios, '10.0'  # Change from default 9.0
   ```

3. **Info.plist for UPI:**
   ```xml
   <key>LSApplicationQueriesSchemes</key>
   <array>
       <string>tez</string>
       <string>phonepe</string>
       <string>paytmmp</string>
   </array>
   ```

### Android Setup Requirements

1. **Minimum SDK:** 16
2. **Target SDK:** 28
3. **ProGuard Rules:** Required for release builds

### Expo Configuration

For Expo users:
```bash
npx expo install react-native-razorpay
npx expo prebuild  # Required to generate native folders
npx expo run:ios --device  # or run:android
```

## Example Implementation

### Basic Usage

```javascript
import RazorpayCheckout from 'react-native-razorpay';

const payWithRazorpay = () => {
  const options = {
    description: 'Credits towards consultation',
    image: 'https://i.imgur.com/3g7nmJC.png',
    currency: 'INR',
    key: 'rzp_test_1DP5mmOlF5G5ag',
    amount: '5000',
    name: 'Merchant Name',
    prefill: {
      email: 'user@example.com',
      contact: '9999999999',
      name: 'John Doe'
    },
    theme: { color: '#F37254' }
  };

  RazorpayCheckout.open(options)
    .then((data) => {
      alert(`Success: ${data.razorpay_payment_id}`);
    })
    .catch((error) => {
      alert(`Error: ${error.code} | ${error.description}`);
    });
};
```

### Advanced Usage with External Wallets

```javascript
RazorpayCheckout.open(options)
  .then(handleSuccess)
  .catch(handleError);

RazorpayCheckout.onExternalWalletSelection((data) => {
  alert(`External Wallet Selected: ${data.external_wallet}`);
});
```

## Troubleshooting and Common Issues

### iOS Issues

1. **"Use of undeclared identifier 'Razorpay'"**
   - Solution: Ensure razorpay-pod is properly installed via CocoaPods

2. **"Library not loaded: @rpath/libswiftCore.dylib"**
   - Solution: Set "Always Embed Swift Standard Libraries" to YES

3. **Archive/Distribution failures**
   - Solution: Check framework embedding settings

### Android Issues

1. **"Execution failed for task ':app:preDebugBuild'"**
   - Solution: Ensure proper Gradle configuration and dependencies

2. **App crashes on payment**
   - Solution: Add ProGuard rules for release builds

3. **"Undefined|Undefined" showing on payment**
   - Solution: Check options object structure and API key validity

### General Issues

1. **Payment not working in production**
   - Switch from test keys to live keys
   - Ensure proper server-side order creation

2. **Events not firing**
   - Check event listener setup
   - Ensure proper cleanup of subscriptions

## Version History and Updates

The library has evolved significantly:
- **Current Version:** 2.3.0
- **React Native Support:** >=0.66.0
- **Major Updates:** Auto-linking support, iOS Swift updates, Android SDK updates

## Security Considerations

1. **API Key Management:**
   - Never expose live keys in client code
   - Use test keys for development

2. **Payment Verification:**
   - Always verify payments on server-side
   - Use webhooks for reliable payment confirmation

3. **Data Handling:**
   - Sensitive payment data is handled by native SDKs
   - No payment details stored in JavaScript layer

## Performance Considerations

1. **Memory Management:**
   - Event listeners are automatically cleaned up
   - Native modules handle memory efficiently

2. **UI Thread Management:**
   - iOS operations dispatched to main queue
   - Android uses activity-based lifecycle

This knowledge transfer document provides a comprehensive understanding of the React Native Razorpay wrapper, covering every aspect from high-level architecture to implementation details, enabling developers to effectively use, maintain, and extend the library. 