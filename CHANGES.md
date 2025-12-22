# Checkout Sheet Kit SDK Support & UPI Intent Fixes

## Overview
Added support for Shopify checkout-sheet-kit SDK integration and fixed UPI intent app detection/handling.

## Key Changes

### 1. Checkout Sheet Kit Integration
- **WebView Resolution**: Added reflection-based discovery of WebView from checkout-sheet-kit cache
- **Fallback Mechanism**: Searches global window manager if cache lookup fails
- **API Update**: `injectJavascriptIntoWebview()` now accepts `isCheckoutSheetKit` boolean parameter

### 2. UPI App Detection
- **App Short Codes**: Fixed mapping (`google_pay`, `cred` instead of `gpay`, `credpay`)
- **New App**: Added `tez` support
- **Dynamic Detection**: `getAppsWhichSupportUpi()` now async and returns detected apps at runtime

### 3. Android Intent Queries
- **Structure Fix**: Separated intent blocks per payment app scheme
- **Impact**: Ensures proper deep linking for phonepe, credpay, paytm, bhim, postpe

### 4. WebView URL Handling
- **Bug Fix**: Use `request.getUrl().toString()` instead of `view.getUrl()` in `shouldOverrideUrlLoading`
- **Impact**: Correct URL redirection for non-HTTP(S) schemes (e.g., UPI deep links)

### 5. JavaScript Injection
- **Dynamic Apps**: Injects detected UPI apps into `window.Razorpay.method.upi.intent.apps`
- **Immediate Execution**: Evaluates script immediately after WebViewClient setup
- **Dual Support**: Works with both standard WebView and checkout-sheet-kit

## Files Modified
- `RazorpayCheckout.js` - UPI detection and JS injection
- `RazorpayModule.java` - Checkout-sheet-kit WebView resolution
- `RazorpayWebViewClient.java` - URL handling fix
- `AndroidManifest.xml` - Intent queries structure
- `example/App.tsx` - Demo integration
- `package.json` - Dependencies and scripts

