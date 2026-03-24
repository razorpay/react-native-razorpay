package com.razorpay.rn;

import android.app.Activity;
import android.content.Intent;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import com.razorpay.Checkout;
import com.razorpay.PaymentData;
import org.json.JSONObject;

/**
 * Shared implementation for RazorpayModule that works with both old and new architecture.
 * This class contains all the business logic for Razorpay payment processing.
 */
public class RazorpayModuleImpl {

    public static final String MAP_KEY_RZP_PAYMENT_ID = "razorpay_payment_id";
    public static final String MAP_KEY_PAYMENT_ID = "payment_id";
    public static final String MAP_KEY_ERROR_CODE = "code";
    public static final String MAP_KEY_ERROR_DESC = "description";
    public static final String MAP_KEY_PAYMENT_DETAILS = "details";
    public static final String MAP_KEY_WALLET_NAME = "name";

    private final ReactApplicationContext reactContext;

    public RazorpayModuleImpl(ReactApplicationContext reactContext) {
        this.reactContext = reactContext;
    }

    /**
     * Opens the Razorpay checkout with the provided options.
     */
    public void open(ReadableMap options) {
        Activity currentActivity = reactContext.getCurrentActivity();
        if (currentActivity == null) {
            return;
        }

        try {
            JSONObject optionsJSON = Utils.readableMapToJson(options);
            Intent intent = new Intent(currentActivity, com.razorpay.CheckoutActivity.class);
            intent.putExtra("OPTIONS", optionsJSON.toString());
            intent.putExtra("FRAMEWORK", "react_native");
            currentActivity.startActivityForResult(intent, Checkout.RZP_REQUEST_CODE);
        } catch (Exception e) {
            // Silently fail as per original implementation
        }
    }

    /**
     * Handles successful payment callback from Razorpay SDK.
     */
    public void onPaymentSuccess(String razorpayPaymentId, PaymentData paymentData) {
        sendEvent("Razorpay::PAYMENT_SUCCESS", Utils.jsonToWritableMap(paymentData.getData()));
    }

    /**
     * Handles payment error callback from Razorpay SDK.
     */
    public void onPaymentError(int code, String description, PaymentData paymentData) {
        WritableMap errorParams = Arguments.createMap();
        JSONObject paymentDataJson = paymentData.getData();
        try {
            paymentDataJson.put(MAP_KEY_ERROR_CODE, code);
            paymentDataJson.put(MAP_KEY_ERROR_DESC, description);
        } catch (Exception e) {
            // Silently fail as per original implementation
        }
        sendEvent("Razorpay::PAYMENT_ERROR", Utils.jsonToWritableMap(paymentDataJson));
    }

    /**
     * Handles external wallet selection callback from Razorpay SDK.
     */
    public void onExternalWalletSelected(String walletName, PaymentData paymentData) {
        sendEvent("Razorpay::EXTERNAL_WALLET_SELECTED", Utils.jsonToWritableMap(paymentData.getData()));
    }

    /**
     * Sends an event to JavaScript layer via DeviceEventEmitter.
     * This works in both old and new architecture.
     */
    private void sendEvent(String eventName, WritableMap params) {
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
            .emit(eventName, params);
    }
}
