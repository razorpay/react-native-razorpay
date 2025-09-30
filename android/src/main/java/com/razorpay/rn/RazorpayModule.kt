package com.razorpay.rn

import android.app.Activity
import android.content.Intent
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableMap
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.razorpay.Checkout
import com.razorpay.CheckoutActivity
import com.razorpay.ExternalWalletListener
import com.razorpay.PaymentData
import com.razorpay.PaymentResultWithDataListener

@ReactModule(name = RazorpayModule.NAME)
class RazorpayModule(reactContext: ReactApplicationContext) :
  NativeRazorpaySpec(reactContext), PaymentResultWithDataListener, ExternalWalletListener, ActivityEventListener {

    private lateinit var checkout: Checkout
    private var eventsHash = HashMap<String, Any>().apply {
      put("success", "Razorpay::PAYMENT_SUCCESS")
      put("failure", "Razorpay::PAYMENT_ERROR")
      put("external_wallet", "Razorpay::EXTERNAL_WALLET_SELECTED")
    }

  init {
    reactContext.addActivityEventListener(this)
  }

  override fun getName(): String {
    return NAME
  }

  // Example method
  // See https://reactnative.dev/docs/native-modules-android
  override fun multiply(a: Double, b: Double): Double {
    return a * b
  }

  override fun open(options: ReadableMap?) {
    val activity = reactApplicationContext.currentActivity
    if (activity == null) {
      sendEvent(eventsHash.get("failure") as String, Utils.createErrorJson(
        "REACT_NO_ACTIVITY_FOUND", "Activity object cannot be null",
        metadata = null
      ) )
      return
    }

    try {
      if(options!=null){
        checkout = Checkout()
        val optionsJSON = Utils.readableMapToJson(options)
        val intent = Intent(activity, CheckoutActivity::class.java).apply {
          putExtra("OPTIONS", optionsJSON.toString())
          putExtra("FRAMEWORK", "react_native")
        }
        activity.startActivityForResult(intent, Checkout.RZP_REQUEST_CODE)
      }else{
        sendEvent(eventName = eventsHash.get("failure") as String, params = Utils.createErrorJson("REACT_INVALID_OPTIONS", "Options object is invalid. Please try again", metadata = null))
        return
      }  // You can resolve the promise here if needed
    } catch (e: Exception) {
      sendEvent(eventName = eventsHash.get("failure") as String, params = Utils.createErrorJson("REACT_NATIVE_ERROR", e.message, metadata = null))
    }
  }

  fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {

    if (requestCode == Checkout.RZP_REQUEST_CODE) {
      checkout.merchantActivityResult(reactApplicationContext.currentActivity,
        requestCode,
        resultCode,
        data,
        this,
        this)
    }
  }

  override fun onPaymentSuccess(p0: String?, p1: PaymentData?) {
    p1?.let {
      sendEvent(eventsHash.get("success") as String, Utils.jsonToWritableMap(it.data))
    }

  }

  override fun onPaymentError(p0: Int, p1: String?, p2: PaymentData?) {
    p2?.let {
      val paymentDataJson = p2.data
      try {
        paymentDataJson.put("code", p0)
        paymentDataJson.put("description", p1)
      } catch (e: Exception) {
        // Handle silently
      }
      sendEvent(eventsHash.get("failure") as String, Utils.jsonToWritableMap(paymentDataJson))
    }

  }

  override fun onActivityResult(
    activity: Activity,
    requestCode: Int,
    resultCode: Int,
    data: Intent?,
  ) {
    onActivityResult(requestCode, resultCode, data)
  }

  override fun onNewIntent(intent: Intent) {
    //no-op
  }

  override fun onExternalWalletSelected(p0: String?, p1: PaymentData?) {
    p1?.let {
      sendEvent(eventsHash.get("external_wallet") as String, Utils.jsonToWritableMap(it.data))
    }


  }

  private fun sendEvent(eventName: String, params: WritableMap) {
    reactApplicationContext
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit(eventName, params)
  }

  companion object {
    const val NAME = "Razorpay"
  }
}
