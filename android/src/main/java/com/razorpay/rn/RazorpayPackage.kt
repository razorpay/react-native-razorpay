package com.razorpay.rn

import com.facebook.react.TurboReactPackage
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.NativeModule
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider

class RazorpayPackage : TurboReactPackage() {

    override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? {
        return when (name) {
            RazorpayTurboModule.NAME -> RazorpayTurboModule(reactContext)
            else -> null
        }
    }

    override fun getReactModuleInfoProvider(): ReactModuleInfoProvider {
        return ReactModuleInfoProvider {
            mapOf(
                RazorpayTurboModule.NAME to ReactModuleInfo(
                    _name = RazorpayTurboModule.NAME,
                    _className = RazorpayTurboModule.NAME,
                    _canOverrideExistingModule = false,
                    _needsEagerInit = false,
                    _hasConstants = true,
                    _isCxxModule = false,
                    _isTurboModule = true  // Always true for 3.0.0
                )
            )
        }
    }
}