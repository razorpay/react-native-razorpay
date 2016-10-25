
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
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import java.util.Iterator;
import android.app.Activity;
import javax.annotation.Nullable;
import android.content.Intent;
import android.os.Bundle;





public class RazorpayModule extends ReactContextBaseJavaModule implements ActivityEventListener {


  public static final int RZP_REQUEST_CODE = 72967729;
  public static final String MAP_KEY_RZP_PAYMENT_ID = "razorpay_payment_id";
  public static final String MAP_KEY_PAYMENT_ID = "payment_id";
  public static final String MAP_KEY_ERROR_CODE = "code";
  public static final String MAP_KEY_ERROR_DESC = "description";
  ReactApplicationContext reactContext;
  public RazorpayModule(ReactApplicationContext reactContext) {
    super(reactContext);
    this.reactContext = reactContext;
    reactContext.addActivityEventListener(this);
  }

  @Override
  public String getName() {
    return "RazorpayCheckout";
  }

  @ReactMethod
  public void open(ReadableMap options) {
    Activity currentActivity = getCurrentActivity();
    try {
      JSONObject optionsJSON = readableMapToJson(options);
      Intent intent = new Intent(currentActivity, CheckoutActivity.class);
      intent.putExtra("OPTIONS", optionsJSON.toString());
      currentActivity.startActivityForResult(intent, RZP_REQUEST_CODE);
    } catch (Exception e) {}
  }


  @Nullable
  private static JSONObject readableMapToJson(ReadableMap readableMap) {
    JSONObject jsonObject = new JSONObject();

    if (readableMap == null) {
      return null;
    }

    ReadableMapKeySetIterator iterator = readableMap.keySetIterator();
    if (!iterator.hasNextKey()) {
      return null;
    }

    while (iterator.hasNextKey()) {
      String key = iterator.nextKey();
      ReadableType readableType = readableMap.getType(key);

      try {
        switch (readableType) {
        case Null:
          jsonObject.put(key, null);
          break;
        case Boolean:
          jsonObject.put(key, readableMap.getBoolean(key));
          break;
        case Number:
          // Can be int or double.
          jsonObject.put(key, readableMap.getInt(key));
          break;
        case String:
          jsonObject.put(key, readableMap.getString(key));
          break;
        case Map:
          jsonObject.put(key, readableMapToJson(readableMap.getMap(key)));
          break;
        case Array:
          jsonObject.put(key, readableMap.getArray(key));
        default:
          // Do nothing and fail silently
        }
      } catch (JSONException ex) {
        // Do nothing and fail silently
      }
    }
    return jsonObject;
  }

  @Override
  public void onActivityResult(int requestCode, int resultCode, Intent data){
    if (requestCode != RZP_REQUEST_CODE) return;
    String result = null;
    if (data != null) {
      Bundle extras = data.getExtras();
      if (extras != null) {
        result = extras.getString("RESULT");
      }
    }
    if (resultCode == 1) {
      try {
        JSONObject resultJson = new JSONObject(result);
        WritableMap successParams = Arguments.createMap();
        successParams.putString(MAP_KEY_PAYMENT_ID, resultJson.getString(MAP_KEY_RZP_PAYMENT_ID));
        sendEvent("Razorpay::PAYMENT_SUCCESS", successParams);
      } catch(Exception e){}
    }
    else {
      if (resultCode == Activity.RESULT_CANCELED) {
        result = "Payment Cancelled";
      }
      WritableMap errorParams = Arguments.createMap();
      errorParams.putInt(MAP_KEY_ERROR_CODE, resultCode);
      errorParams.putString(MAP_KEY_ERROR_DESC, result);
      sendEvent("Razorpay::PAYMENT_ERROR", errorParams);
    }
  }

  private void sendEvent(String eventName, @Nullable WritableMap params) {
  reactContext
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
      .emit(eventName, params);
  }

}
