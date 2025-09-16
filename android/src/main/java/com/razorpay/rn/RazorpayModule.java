
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
import com.razorpay.AnalyticsEvent;
import com.razorpay.CheckoutActivity;
import com.razorpay.PaymentData;
import com.razorpay.PaymentResultWithDataListener;
import com.razorpay.ExternalWalletListener;
import com.razorpay.Checkout;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Iterator;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.CountDownTimer;
import android.view.View;
import android.view.ViewGroup;
import android.view.ViewParent;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import android.util.Log;
import android.webkit.WebViewClient;

import androidx.annotation.Nullable;

import java.util.ArrayList;
import java.util.List;





public class RazorpayModule extends ReactContextBaseJavaModule implements ActivityEventListener, PaymentResultWithDataListener , ExternalWalletListener {


  public static final int RZP_REQUEST_CODE = 72967729;
  public static final String MAP_KEY_RZP_PAYMENT_ID = "razorpay_payment_id";
  public static final String MAP_KEY_PAYMENT_ID = "payment_id";
  public static final String MAP_KEY_ERROR_CODE = "code";
  public static final String MAP_KEY_ERROR_DESC = "description";
  public static final String MAP_KEY_PAYMENT_DETAILS = "details";
  public static final String MAP_KEY_WALLET_NAME="name";
  public static final int UPI_INTENT_REQUEST_CODE = 1001;
  ReactApplicationContext reactContext;
  private WebView shopifyWebView;

  public RazorpayModule(ReactApplicationContext reactContext) {
    super(reactContext);
    this.reactContext = reactContext;
    reactContext.addActivityEventListener(this);
  }

  private WebViewClient originalWebViewClient = null;

  private WebViewClient proxyWebViewClient = new WebViewClient(){
    @Override
    public void onPageStarted(WebView view, String url, Bitmap favicon) {
      if(originalWebViewClient != null){
        originalWebViewClient.onPageStarted(view, url, favicon);
      }else{
        super.onPageStarted(view, url, favicon);
      }

    }

    @Override
    public void onPageFinished(WebView view, String url) {
      insertOtpelf(view);
      if(originalWebViewClient != null){
        originalWebViewClient.onPageFinished(view, url);
      }else{
        super.onPageFinished(view, url);
      }

    }

    @Override
    public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
      if(!request.getUrl().toString().startsWith("https") || !request.getUrl().toString().startsWith("http")){
        getCurrentActivity().startActivityForResult(new Intent(Intent.ACTION_VIEW, request.getUrl()), UPI_INTENT_REQUEST_CODE);
      }else {
        if(originalWebViewClient != null){
          return originalWebViewClient.shouldOverrideUrlLoading(view, request);
        }else{
          return super.shouldOverrideUrlLoading(view, request);
        }
      }
    }
  };



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

  @ReactMethod
  public void callNativeIntentUrl(String intentUrl) {
    Intent intent = new Intent(Intent.ACTION_VIEW);
    intent.setData(Uri.parse(intentUrl));
    getCurrentActivity().startActivityForResult(intent, UPI_INTENT_REQUEST_CODE);
  }

  private void insertOtpelf(WebView webView) {
    Log.d("RazorpayModule", "insertOtpelf called for WebView: " + webView.getUrl());
    try {
      JSONObject settings = new JSONObject();
      settings.put("merchant_key", "merchantKey");
      settings.put("otp_permission", "true");
      JSONObject sdk = new JSONObject();
      sdk.put("type", "standard");
      sdk.put("version", "1.0.0");
      sdk.put("platform", "android");
      sdk.put("framework", "react-native");
      sdk.put("name","standard_android_react_native");
      settings.put("sdk", sdk);

      JSONObject plugin = new JSONObject();


        plugin.put("type", "rzpassist");
//        plugin.put("version_code", ResourceUtils.getRzpAssistVersionCode());

      settings.put("plugin", plugin);
//      settings.put("payment_data", paymentData);
//      settings.put("preferences", otpElfPreferences);

      JSONObject metadata = new JSONObject();
      metadata.put("package_name", getCurrentActivity().getApplicationContext().getPackageName());
      PackageManager packageManager = getCurrentActivity().getPackageManager();
      PackageInfo packageInfo = packageManager.getPackageInfo(getCurrentActivity().getPackageName(), 0);
//      metadata.put("app_name", returnUndefinedIfNull(packageInfo.applicationInfo.loadLabel(packageManager)));
      metadata.put("platform","mobile_sdk");
      metadata.put("os", "android");
      metadata.put("os_version", Build.VERSION.RELEASE);
      metadata.put("data_network_type", "");
      metadata.put("framework","react_native");
      metadata.put("library","standard");
      metadata.put("sdk",sdk);

      settings.put("metadata",metadata);
      injectJs(webView, "window.__rzp_options = " + settings.toString());
    } catch (Exception e) {
      Log.e("RazorpayModule", "Unable to load otpelf settings", e);
      e.printStackTrace();
    }

    // Load OtpElf Js
    Log.d("RazorpayModule", "Loading OtpElf JavaScript...");
    injectJs(webView, readRawTextFile());
    Log.d("RazorpayModule", "insertOtpelf completed successfully");


  }

  public String readRawTextFile() {
    // Get the InputStream for the raw resource file
    // 'getResources()' is a method of the Context
    InputStream inputStream = getCurrentActivity().getResources().openRawResource(R.raw.otpelf);

    // Use a StringBuilder to build the string
    StringBuilder stringBuilder = new StringBuilder();

    // Use a try-with-resources block to automatically close the stream
    try (BufferedReader reader = new BufferedReader(new InputStreamReader(inputStream, StandardCharsets.UTF_8))) {
      String line;
      while ((line = reader.readLine()) != null) {
        stringBuilder.append(line);
      }
    } catch (Exception e) {
      e.printStackTrace();
      return null; // Return null or handle the error appropriately
    }

    return stringBuilder.toString();
  }

  private void injectJs(WebView webView, String js) {
    Log.d("RazorpayModule", "Injecting JavaScript into WebView: " + webView.getUrl());
    Log.d("RazorpayModule", "JavaScript length: " + (js != null ? js.length() : "null"));
    webView.loadUrl(String.format("javascript: %s", js));
    Log.d("RazorpayModule", "JavaScript injection completed");
  }


  /** -------- BFS helper to find the first view of a given type in a subtree -------- */
  @SuppressWarnings("unchecked")
  public static <T extends View> @Nullable T bfsFind(View root, Class<T> klass) {
    if (root == null) return null;
    Deque<View> q = new ArrayDeque<>();
    q.add(root);
    while (!q.isEmpty()) {
      View v = q.removeFirst();
      if (klass.isInstance(v)) {
        return (T) v;
      }
      if (v instanceof ViewGroup vg) {
          for (int i = 0; i < vg.getChildCount(); i++) {
          q.addLast(vg.getChildAt(i));
        }
      }
    }
    return null;
  }


  @ReactMethod
  public void shopifyCheckoutStarted(){
    Activity activity = getCurrentActivity();
    if(activity == null){
      return;
    }
    List<View> roots = android.view.inspector.WindowInspector.getGlobalWindowViews();
    for (View root:
         roots) {
      WebView wv = bfsFind(root, WebView.class);
      if (wv != null && wv.isShown()) {
        activity.runOnUiThread(new Runnable() {
          @Override
          public void run() {
            if(wv.getClass().getName().equalsIgnoreCase("com.shopify.checkoutsheetkit.CheckoutWebView")
                    &&  (wv.getParent()!=null?wv.getParent().getClass().getName():"null").equalsIgnoreCase("com.shopify.checkoutsheetkit.CheckoutWebViewContainer")){
              shopifyWebView = wv;
              originalWebViewClient = shopifyWebView.getWebViewClient();
              shopifyWebView.setWebViewClient(proxyWebViewClient);
            }
          }
        });
      }
    }
  }

  public void onActivityResult(Activity activity, int requestCode, int resultCode, Intent data) {
    if(requestCode != UPI_INTENT_REQUEST_CODE){
      onActivityResult(requestCode, resultCode, data);
    }
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

}
