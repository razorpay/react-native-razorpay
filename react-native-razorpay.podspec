require 'json'

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))

Pod::Spec.new do |s|
  s.name         = package['name']
  s.version      = package['version']
  s.summary      = package['description']
  s.license      = package['license']

  s.authors      = package['author']
  s.homepage     = package['homepage']
  s.platform     = :ios, "10.0"
  s.ios.deployment_target = '10.0'

  s.source       = { :git => "https://github.com/razorpay/react-native-razorpay.git", :tag => "v#{s.version}" }

  # Common dependencies for all subspecs
  s.dependency 'React'
  s.dependency 'razorpay-pod'

  # Default subspec (Standard)
  s.default_subspec = 'Standard'

  # Standard Bridge - No Turbo functionality
  s.subspec 'Standard' do |ss|
    ss.source_files = [
      'ios/RazorpayCheckout.h',
      'ios/RazorpayCheckout.m',
      'ios/RazorpayEventEmitter.h',
      'ios/RazorpayEventEmitter.m'
    ]
    
    # Only set flags that are actually used - no unused flags!
    ss.pod_target_xcconfig = {
      'GCC_PREPROCESSOR_DEFINITIONS' => '$(inherited)'  # No Turbo flag = Standard mode
    }
  end

  # Turbo Bridge - Full Turbo functionality
  s.subspec 'Turbo' do |ss|
    ss.source_files = [
      'ios/RazorpayCheckout.h',
      'ios/RazorpayCheckout.m',
      'ios/RazorpayEventEmitter.h',
      'ios/RazorpayEventEmitter.m',
      'ios/RazorpayTurboManager.swift'
    ]
    
    # Turbo-specific dependencies
    ss.dependency 'razorpay-turbo'
    
    # Only set the flag that's actually used in code
    ss.pod_target_xcconfig = {
      'GCC_PREPROCESSOR_DEFINITIONS' => '$(inherited) RAZORPAY_TURBO_ENABLED=1',
      'OTHER_SWIFT_FLAGS' => '$(inherited) -DRAZORPAY_TURBO_ENABLED'
    }
  end

end