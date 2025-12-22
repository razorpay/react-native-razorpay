
package com.razorpay.rn;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ActivityEventListener;
import com.facebook.react.bridge.Callback;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.ReadableMapKeySetIterator;
import com.facebook.react.bridge.ReadableType;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.WritableNativeArray;
import com.facebook.react.bridge.WritableNativeMap;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import com.razorpay.CheckoutActivity;
import com.razorpay.PaymentData;
import com.razorpay.PaymentResultWithDataListener;
import com.razorpay.ExternalWalletListener;
import com.razorpay.Checkout;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import java.util.Iterator;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Intent;
import android.graphics.Bitmap;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.webkit.WebViewCompat;
import androidx.webkit.WebViewFeature;

import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.util.List;

import androidx.annotation.Nullable;


public class RazorpayModule extends ReactContextBaseJavaModule implements ActivityEventListener, PaymentResultWithDataListener , ExternalWalletListener {


  public static final int RZP_REQUEST_CODE = 72967729;
  public static final String MAP_KEY_RZP_PAYMENT_ID = "razorpay_payment_id";
  public static final String MAP_KEY_PAYMENT_ID = "payment_id";
  public static final String MAP_KEY_ERROR_CODE = "code";
  public static final String MAP_KEY_ERROR_DESC = "description";
  public static final String MAP_KEY_PAYMENT_DETAILS = "details";
  public static final String MAP_KEY_WALLET_NAME="name";
  ReactApplicationContext reactContext;
  public RazorpayModule(ReactApplicationContext reactContext) {
    super(reactContext);
    this.reactContext = reactContext;
    reactContext.addActivityEventListener(this);
  }

  @Override
  public String getName() {
    return "RNRazorpayCheckout";
  }

  @ReactMethod
  public void open(ReadableMap options) {
    Activity currentActivity = getCurrentActivity();
    try {
      JSONObject optionsJSON = Utils.readableMapToJson(options);
      Intent intent = new Intent(currentActivity, CheckoutActivity.class);
      intent.putExtra("OPTIONS", optionsJSON.toString());
      intent.putExtra("FRAMEWORK", "react_native");
      currentActivity.startActivityForResult(intent, Checkout.RZP_REQUEST_CODE);
    } catch (Exception e) {}
  }

  public void onActivityResult(Activity activity, int requestCode, int resultCode, Intent data) {
    onActivityResult(requestCode, resultCode, data);
  }

  public void onNewIntent(Intent intent) {}


  public void onActivityResult(int requestCode, int resultCode, Intent data){
     Checkout.handleActivityResult(getCurrentActivity(), requestCode, resultCode, data, this, this);
  }

  private void sendEvent(String eventName, WritableMap params) {
  reactContext
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
      .emit(eventName, params);
  }

   @Override
    public void onPaymentSuccess(String razorpayPaymentId, PaymentData paymentData) {
      sendEvent("Razorpay::PAYMENT_SUCCESS", Utils.jsonToWritableMap(paymentData.getData()));
    }

    @Override
    public void onPaymentError(int code, String description, PaymentData paymentData) {
      WritableMap errorParams = Arguments.createMap();
      JSONObject paymentDataJson = paymentData.getData();
      try{
        paymentDataJson.put(MAP_KEY_ERROR_CODE, code);
        paymentDataJson.put(MAP_KEY_ERROR_DESC, description);
      } catch(Exception e){
      }
      sendEvent("Razorpay::PAYMENT_ERROR", Utils.jsonToWritableMap(paymentDataJson));
    }

    @Override
    public void onExternalWalletSelected(String walletName, PaymentData paymentData){
      sendEvent("Razorpay::EXTERNAL_WALLET_SELECTED", Utils.jsonToWritableMap(paymentData.getData()));
    }

    @ReactMethod
    public void injectJavascriptIntoWebView(String javascript, @Nullable Boolean isCheckoutSheetKit){
      System.out.println("injectJavascriptIntoWebView");
      Activity currentActivity = getCurrentActivity();
      if(currentActivity == null || currentActivity.isFinishing()){
        System.out.println("currentActivity is null or finishing");
          return;
      }

      currentActivity.runOnUiThread(() -> {
        boolean useCheckoutSheetKit = isCheckoutSheetKit != null && isCheckoutSheetKit;
        WebView webView = useCheckoutSheetKit
                ? resolveCheckoutKitWebView(currentActivity)
                : resolveReactNativeWebView(currentActivity);
        if(webView == null){
          System.out.println("webView is null");
            return;
        }

        System.out.println("webView source is checkout-sheet-kit: " + useCheckoutSheetKit);

          proxyWebViewClientAndInjectJavascript(webView, javascript, currentActivity);

      });
    }

  private WebView resolveCheckoutKitWebView(Activity currentActivity){
    // Prefer the checkout-sheet-kit cache entry if available.
    WebView cached = getCheckoutKitCachedWebView();
    if (cached != null){
      return cached;
    }

    // Last resort: inspect global windows (dialogs).
    WebView dialogWebView = findFirstWebViewInGlobalWindows();
    if (dialogWebView != null){
      return dialogWebView;
    }

    return null;
  }

  private WebView resolveReactNativeWebView(Activity currentActivity){
    View rootView = currentActivity.getWindow().getDecorView().getRootView();
    return findFirstWebView(rootView);
  }

  private WebView getCheckoutKitCachedWebView(){
    try{
      Class<?> checkoutWebViewClass = Class.forName("com.shopify.checkoutsheetkit.CheckoutWebView");
      Field companionField = checkoutWebViewClass.getField("Companion");
      Object companion = companionField.get(null);
      Method getCacheEntry = companion.getClass().getMethod("getCacheEntry");
      Object cacheEntry = getCacheEntry.invoke(companion);
      if (cacheEntry != null){
        Method getView = cacheEntry.getClass().getMethod("getView");
        Object viewObj = getView.invoke(cacheEntry);
        if (viewObj instanceof WebView){
          System.out.println("Found checkout-sheet-kit webview from cacheEntry");
          return (WebView) viewObj;
        }
      }
    } catch (Throwable t){
      System.out.println("CheckoutWebView cacheEntry access failed");
    }
    return null;
  }

  private WebView findFirstWebViewInGlobalWindows(){
    try{
      Class<?> wmgClass = Class.forName("android.view.WindowManagerGlobal");
      Method getInstanceMethod = wmgClass.getMethod("getInstance");
      Object wmgInstance = getInstanceMethod.invoke(null);
      Field viewsField = wmgClass.getDeclaredField("mViews");
      viewsField.setAccessible(true);
      Object viewsObj = viewsField.get(wmgInstance);
      if (viewsObj instanceof List){
        List<?> views = (List<?>) viewsObj;
        for (Object viewObj : views){
          if (viewObj instanceof View){
            WebView webView = findFirstWebView((View) viewObj);
            if (webView != null){
              System.out.println("Found WebView in global windows");
              return webView;
            }
          }
        }
      }
    } catch (Throwable t){
      System.out.println("findFirstWebViewInGlobalWindows failed");
    }
    return null;
  }

    @SuppressLint("WebViewApiAvailability")
    private void proxyWebViewClientAndInjectJavascript(WebView webView, String javascript, Activity currentActivity){
        System.out.println("proxyWebViewClientAndInjectJavascript");
        final WebViewClient oldClient =
                WebViewFeature.isFeatureSupported(WebViewFeature.GET_WEB_VIEW_CLIENT) ?
                        WebViewCompat.getWebViewClient(webView) : (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) ?
                        webView.getWebViewClient() : null;

        WebViewClient newClient = new RazorpayWebViewClient(currentActivity, oldClient, javascript);


        webView.setWebViewClient(newClient);
        // Ensure script runs even if the page is already loaded.
        webView.evaluateJavascript(javascript, null);
    }



    private WebView findFirstWebView(View rootView){
      System.out.println("findFirstWebView");
      if (rootView == null){
        System.out.println("rootView is null");
          return null;
      }

      if (rootView instanceof WebView){
        System.out.println("rootView is instance of WebView");
          return (WebView) rootView;
      }
      System.out.println("rootView is instance of ViewGroup");
      if (rootView instanceof ViewGroup){
          ViewGroup viewGroup = (ViewGroup) rootView;
          for (int i = 0; i < viewGroup.getChildCount(); i++) {
              WebView childView = findFirstWebView(viewGroup.getChildAt(i));
              if(childView != null){
                System.out.println("childView is not null");
                  return childView;
              }
          }

      }

      return null;
    }

}
