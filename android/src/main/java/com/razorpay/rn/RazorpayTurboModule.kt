package com.razorpay.rn

import android.app.Activity
import android.content.Intent
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.razorpay.*
import org.json.JSONObject

class RazorpayTurboModule(reactContext: ReactApplicationContext) : 
    NativeRazorpayCheckoutSpec(reactContext),
    ActivityEventListener, 
    PaymentResultWithDataListener, 
    ExternalWalletListener {

    companion object {
        const val NAME = "RNRazorpayCheckout"
        const val MAP_KEY_ERROR_CODE = "code"
        const val MAP_KEY_ERROR_DESC = "description"
    }

    private val reactContext: ReactApplicationContext = reactContext

    init {
        reactContext.addActivityEventListener(this)
    }

    override fun getName(): String = NAME

    @ReactMethod
    override fun open(options: ReadableMap) {
        currentActivity?.let { activity ->
            try {
                val optionsJSON = Utils.readableMapToJson(options)
                val intent = Intent(activity, CheckoutActivity::class.java).apply {
                    putExtra("OPTIONS", optionsJSON.toString())
                    putExtra("FRAMEWORK", "react_native")
                }
                activity.startActivityForResult(intent, Checkout.RZP_REQUEST_CODE)
            } catch (e: Exception) {
                // Handle error silently for now
                JSONObject errorResponse = JSONObject()
                errorResponse.put("code", 0)
                errorResponse.put("description", "${e.localizedMessage}")
                sendEvent("Razorpay::PAYMENT_ERROR", Utils.jsonToWritableMap(errorResponse))
            }
        }
    }

    // Event emitter methods required for TurboModule
    @ReactMethod
    override fun addListener(eventName: String) {
        // Required for RCTEventEmitter compatibility
    }

    @ReactMethod
    override fun removeListeners(count: Double) {
        // Required for RCTEventEmitter compatibility
    }

    // Activity lifecycle methods
    override fun onActivityResult(activity: Activity?, requestCode: Int, resultCode: Int, data: Intent?) {
        currentActivity?.let {
            Checkout.handleActivityResult(it, requestCode, resultCode, data, this, this)
        }
    }

    override fun onNewIntent(intent: Intent?) {
        // No implementation needed
    }

    // Payment result callbacks
    override fun onPaymentSuccess(razorpayPaymentId: String, paymentData: PaymentData) {
        sendEvent("Razorpay::PAYMENT_SUCCESS", Utils.jsonToWritableMap(paymentData.data))
    }

    override fun onPaymentError(code: Int, description: String, paymentData: PaymentData) {
        val paymentDataJson = paymentData.data
        try {
            paymentDataJson.put(MAP_KEY_ERROR_CODE, code)
            paymentDataJson.put(MAP_KEY_ERROR_DESC, description)
        } catch (e: Exception) {
            // Handle silently
        }
        sendEvent("Razorpay::PAYMENT_ERROR", Utils.jsonToWritableMap(paymentDataJson))
    }

    override fun onExternalWalletSelected(walletName: String, paymentData: PaymentData) {
        sendEvent("Razorpay::EXTERNAL_WALLET_SELECTED", Utils.jsonToWritableMap(paymentData.data))
    }

    private fun sendEvent(eventName: String, params: WritableMap) {
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }
}