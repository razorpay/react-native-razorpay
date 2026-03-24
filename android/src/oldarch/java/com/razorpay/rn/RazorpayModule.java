package com.razorpay.rn;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ActivityEventListener;
import com.facebook.react.bridge.ReadableMap;
import com.razorpay.Checkout;
import com.razorpay.PaymentData;
import com.razorpay.PaymentResultWithDataListener;
import com.razorpay.ExternalWalletListener;
import android.app.Activity;
import android.content.Intent;

/**
 * Old architecture implementation of RazorpayModule.
 * Delegates all business logic to RazorpayModuleImpl for architecture compatibility.
 */
public class RazorpayModule extends ReactContextBaseJavaModule implements ActivityEventListener, PaymentResultWithDataListener, ExternalWalletListener {

    private final RazorpayModuleImpl implementation;
    private final ReactApplicationContext reactContext;

    public RazorpayModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
        this.implementation = new RazorpayModuleImpl(reactContext);
        reactContext.addActivityEventListener(this);
    }

    @Override
    public String getName() {
        return "RNRazorpayCheckout";
    }

    @ReactMethod
    public void open(ReadableMap options) {
        implementation.open(options);
    }

    @Override
    public void onActivityResult(Activity activity, int requestCode, int resultCode, Intent data) {
        onActivityResult(requestCode, resultCode, data);
    }

    @Override
    public void onNewIntent(Intent intent) {
        // No-op
    }

    public void onActivityResult(int requestCode, int resultCode, Intent data) {
        Checkout.handleActivityResult(getCurrentActivity(), requestCode, resultCode, data, this, this);
    }

    @Override
    public void onPaymentSuccess(String razorpayPaymentId, PaymentData paymentData) {
        implementation.onPaymentSuccess(razorpayPaymentId, paymentData);
    }

    @Override
    public void onPaymentError(int code, String description, PaymentData paymentData) {
        implementation.onPaymentError(code, description, paymentData);
    }

    @Override
    public void onExternalWalletSelected(String walletName, PaymentData paymentData) {
        implementation.onExternalWalletSelected(walletName, paymentData);
    }
}
