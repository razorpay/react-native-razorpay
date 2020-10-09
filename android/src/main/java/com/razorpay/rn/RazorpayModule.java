
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
import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;





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

}
