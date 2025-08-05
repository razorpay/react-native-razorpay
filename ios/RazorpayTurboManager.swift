//
//  RazorpayTurboManager.swift
//  RazorpayCheckout
//
//  Created for Turbo functionality separation
//

import Foundation
import Razorpay
import TurboUpiPluginUI

@objc public protocol RazorpayTurboManagerDelegate: AnyObject {
    func onPaymentSuccess(_ paymentId: String, data: [String: Any]?)
    func onPaymentError(_ code: Int, description: String, data: [String: Any]?)
    func onTurboSessionTokenRequested()
}
@objc public class RazorpayTurboManager: NSObject {
    
    @objc public weak var delegate: RazorpayTurboManagerDelegate?
    
    private var razorpay: RazorpayCheckout?
    private var sessionCompletion: ((Session) -> Void)?
    
    @objc public override init() {
        super.init()
    }
    
    // MARK: - Public Interface
    
    @objc public func isTurboAvailable() -> Bool {
        // Simple runtime check for required classes
        return NSClassFromString("TurboUpiPluginUI.RZPTurboUPI") != nil
    }
    
    @objc public func initializeRazorpay(withKey key: String) -> Any? {
        // Follow the exact pattern from native Swift
        razorpay = RazorpayCheckout.initWithKey(key, 
                                              andDelegateWithData: self, 
                                              plugin: RZPTurboUPI.UIPluginInstance())
        
        // Initialize Turbo with self as TurboSessionDelegate
        razorpay?.upiTurbo?.initialize(self)
        
        print("✅ Razorpay initialized with Turbo plugin")
        return razorpay
    }
    
    @objc public func manageUpiAccounts(mobileNumber: String, color: String, completion: @escaping (Bool, Error?) -> Void) {
        guard let razorpay = razorpay else {
            let error = NSError(domain: "TurboError", code: 1001, userInfo: [NSLocalizedDescriptionKey: "Razorpay not initialized"])
            completion(false, error)
            return
        }
        
        // Follow the exact pattern from native Swift
        razorpay.upiTurbo?.manageUpiAccount(mobileNumber: mobileNumber, color: color) { result, error in
            if let error = error {
                completion(false, error as? Error)
            } else {
                completion(true, nil)
            }
        }
    }
    
    @objc public func getTurboPaymentPlugin() -> Any? {
        // Simple and direct - exactly like native Swift
        return RZPTurboUPI.turboUIPaymentPlugin()
    }
    
    @objc public func provideSessionToken(_ token: String) {
        // Create Session object and complete the callback
        if let completion = sessionCompletion {
            let session = Session(token: token)
            completion(session)
            sessionCompletion = nil
            print("✅ Session token provided to Turbo SDK: \(token)")
        } else {
            print("❌ No pending session completion found")
        }
    }
}

// MARK: - RazorpayPaymentCompletionProtocolWithData

extension RazorpayTurboManager: RazorpayPaymentCompletionProtocolWithData {
    
    public func onPaymentSuccess(_ payment_id: String, andData response: [AnyHashable : Any]?) {
        print("✅ Turbo payment success: \(payment_id)")
        
        // Convert [AnyHashable: Any] to [String: Any] for delegate
        var stringKeyData: [String: Any]?
        if let response = response {
            stringKeyData = [:]
            for (key, value) in response {
                if let stringKey = key as? String {
                    stringKeyData?[stringKey] = value
                }
            }
        }
        
        delegate?.onPaymentSuccess(payment_id, data: stringKeyData)
    }
    
    public func onPaymentError(_ code: Int32, description: String, andData response: [AnyHashable : Any]?) {
        print("❌ Turbo payment error: \(code) - \(description)")
        
        // Convert [AnyHashable: Any] to [String: Any] for delegate
        var stringKeyData: [String: Any]?
        if let response = response {
            stringKeyData = [:]
            for (key, value) in response {
                if let stringKey = key as? String {
                    stringKeyData?[stringKey] = value
                }
            }
        }
        
        delegate?.onPaymentError(Int(code), description: description, data: stringKeyData)
    }
}

// MARK: - TurboSessionDelegate

extension RazorpayTurboManager: TurboSessionDelegate {
    
    public func fetchToken(completion: @escaping (Session) -> Void) {
        print("🔄 TurboSessionDelegate fetchToken called - requesting from JS")
        
        // Store the completion for when JS provides the token
        sessionCompletion = completion
        
        // Request token from JavaScript side
        delegate?.onTurboSessionTokenRequested()
    }
} 