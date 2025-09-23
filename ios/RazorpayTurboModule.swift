import Foundation
import React
import Razorpay

@objc(RazorpayTurboModule)
class RazorpayTurboModule: RCTEventEmitter {
    
    // MARK: - Constants
    private struct Events {
        static let paymentSuccess = "Razorpay::PAYMENT_SUCCESS"
        static let paymentError = "Razorpay::PAYMENT_ERROR"
        static let externalWalletSelected = "Razorpay::EXTERNAL_WALLET_SELECTED"
    }
    
    // MARK: - Module Registration
    @objc override static func requiresMainQueueSetup() -> Bool {
        return true
    }
    
    @objc override func supportedEvents() -> [String] {
        return [
            Events.paymentSuccess,
            Events.paymentError,
            Events.externalWalletSelected
        ]
    }
    
    @objc override func constantsToExport() -> [AnyHashable : Any] {
        return [:]
    }
    
    // MARK: - TurboModule Methods
    @objc
    func open(_ options: NSDictionary) {
        DispatchQueue.main.async { [weak self] in
            self?.openRazorpayCheckout(with: options)
        }
    }
    
    // Event emitter compatibility methods (required for TurboModule)
    @objc override func addListener(_ eventName: String) {
        super.addListener(eventName)
    }
    
    @objc override func removeListeners(_ count: NSNumber) {
        super.removeListeners(count)
    }
    
    // MARK: - Private Implementation
    private func openRazorpayCheckout(with options: NSDictionary) {
        guard let keyID = options["key"] as? String else {
            sendPaymentError(code: -1, description: "Invalid key provided", data: [:])
            return
        }
        
        let razorpay = RazorpayCheckout.initWithKey(keyID, andDelegateWithData: self)
        razorpay.setExternalWalletSelectionDelegate(self)
        
        // Prepare options
        let mutableOptions = NSMutableDictionary(dictionary: options)
        mutableOptions["integration"] = "react_native"
        mutableOptions["FRAMEWORK"] = "react_native"
        
        // Get root view controller
        guard let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
              let window = windowScene.windows.first,
              let rootViewController = window.rootViewController else {
            sendPaymentError(code: -1, description: "Unable to get root view controller", data: [:])
            return
        }
        
        let presentingController = rootViewController.presentedViewController ?? rootViewController
        razorpay.open(mutableOptions as [AnyHashable : Any], displayController: presentingController)
    }
    
    private func sendPaymentSuccess(paymentId: String, data: [AnyHashable: Any]) {
        var payload = data
        payload["razorpay_payment_id"] = paymentId
        sendEvent(withName: Events.paymentSuccess, body: payload)
    }
    
    private func sendPaymentError(code: Int, description: String, data: [AnyHashable: Any]) {
        var payload = data
        payload["code"] = code
        payload["description"] = description
        sendEvent(withName: Events.paymentError, body: payload)
    }
    
    private func sendExternalWalletSelected(walletName: String, data: [AnyHashable: Any]) {
        var payload = data
        payload["external_wallet"] = walletName
        sendEvent(withName: Events.externalWalletSelected, body: payload)
    }
}

// MARK: - Razorpay Delegates
extension RazorpayTurboModule: RazorpayPaymentCompletionProtocolWithData {
    func onPaymentSuccess(_ payment_id: String, andData response: [AnyHashable : Any]) {
        sendPaymentSuccess(paymentId: payment_id, data: response)
    }
    
    func onPaymentError(_ code: Int32, description str: String, andData response: [AnyHashable : Any]) {
        sendPaymentError(code: Int(code), description: str, data: response)
    }
}

extension RazorpayTurboModule: ExternalWalletSelectionProtocol {
    func onExternalWalletSelected(_ walletName: String, withPaymentData paymentData: [AnyHashable : Any]) {
        sendExternalWalletSelected(walletName: walletName, data: paymentData)
    }
}