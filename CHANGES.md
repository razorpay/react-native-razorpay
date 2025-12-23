# Process: Checkout Sheet Kit SDK Integration & UPI Intent Handling

## Problem Statement
Enable Razorpay UPI intent apps injection into Shopify checkout-sheet-kit WebView, which uses a different WebView management system than standard React Native WebView.

## Approach

### 1. WebView Discovery Strategy

**Challenge**: Checkout-sheet-kit manages WebView internally, not accessible via standard React Native view hierarchy.

**Solution**: Use Java reflection to access checkout-sheet-kit's internal cache.

**Steps**:
1. Access `com.shopify.checkoutsheetkit.CheckoutWebView.Companion` via reflection
2. Call `getCacheEntry()` to retrieve cached WebView instance
3. Extract WebView from cache entry using `getView()` method
4. Fallback: Search `WindowManagerGlobal.mViews` if cache lookup fails

**Implementation Pattern**:
```java
// Try cache first
Class<?> checkoutWebViewClass = Class.forName("com.shopify.checkoutsheetkit.CheckoutWebView");
Field companionField = checkoutWebViewClass.getField("Companion");
Object companion = companionField.get(null);
Method getCacheEntry = companion.getClass().getMethod("getCacheEntry");
// ... extract WebView from cacheEntry
```

### 2. Dynamic UPI App Detection

**Challenge**: Need to detect installed UPI apps at runtime and inject them into Razorpay options.

**Solution**: Use React Native `Linking.canOpenURL()` to check app availability.

**Steps**:
1. Create mapping of app short codes to deep link schemes
2. Iterate through each app and check if it can be opened
3. Collect list of available apps
4. Pass this list to JavaScript injection

**Key Insight**: Made `getAppsWhichSupportUpi()` async to await all `canOpenURL()` checks before proceeding.

### 3. JavaScript Injection Timing

**Challenge**: Script must execute before Razorpay initializes, but WebView may already be loaded.

**Solution**: Inject script immediately after WebViewClient setup AND on page start.

**Steps**:
1. Call `webView.evaluateJavascript()` immediately after setting WebViewClient
2. Also inject in `onPageStarted()` callback
3. Script sets `window.Razorpay.method.upi.intent.apps` synchronously

**Pattern**: Dual injection ensures script runs regardless of page load state.

### 4. Android Intent Queries Fix

**Challenge**: Multiple `<data>` tags in single `<intent>` block may not work correctly for all apps.

**Solution**: Create separate `<intent>` block for each payment app scheme.

**Before**: One intent with multiple data schemes
**After**: Individual intent blocks per scheme

**Reason**: Android's intent resolution works more reliably with separate intent declarations.

### 5. URL Redirection Bug Fix

**Challenge**: `shouldOverrideUrlLoading(WebView, WebResourceRequest)` was using `view.getUrl()` instead of request URL.

**Solution**: Use `request.getUrl().toString()` to get the actual URL being loaded.

**Impact**: Non-HTTP(S) schemes (like `phonepe://pay`) now redirect correctly.

## Implementation Flow

1. **React Native Layer** (`RazorpayCheckout.js`):
   - Detect UPI apps using `Linking.canOpenURL()`
   - Generate JavaScript with detected apps list
   - Call native module with `isCheckoutSheetKit` flag

2. **Native Module** (`RazorpayModule.java`):
   - Based on flag, choose WebView resolution strategy:
     - `isCheckoutSheetKit=true`: Use reflection-based discovery
     - `isCheckoutSheetKit=false`: Use standard view hierarchy traversal
   - Proxy existing WebViewClient
   - Inject JavaScript immediately

3. **WebViewClient** (`RazorpayWebViewClient.java`):
   - Handle URL overrides for deep links
   - Inject script on page start
   - Preserve original client behavior

## Key Learnings

- **Reflection is necessary** for accessing third-party SDK internals when no public API exists
- **Immediate script evaluation** prevents timing issues with already-loaded pages
- **Separate intent blocks** improve Android deep linking reliability
- **Dual injection points** (immediate + onPageStarted) ensure script execution
- **Async app detection** prevents race conditions with UPI app checks

## Testing Approach

1. Test with standard React Native WebView
2. Test with checkout-sheet-kit WebView
3. Verify UPI apps appear in Razorpay options
4. Test deep link redirection for each payment app
5. Verify script injection works on both fresh and cached pages
