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
  s.default_subspec = 'StandardBridge'

  # Standard Bridge - No Turbo functionality
  s.subspec 'StandardBridge' do |ss|
    ss.source_files = [
      'ios/RazorpayCheckout.h',
      'ios/RazorpayCheckout.m',
      'ios/RazorpayEventEmitter.h',
      'ios/RazorpayEventEmitter.m'
    ]
    
    # Standard bridge specific configuration
    ss.pod_target_xcconfig = {
      'GCC_PREPROCESSOR_DEFINITIONS' => '$(inherited) RAZORPAY_STANDARD_BRIDGE=1'
    }
  end

  # Turbo Bridge - Full Turbo functionality
  s.subspec 'TurboBridge' do |ss|
    ss.source_files = [
      'ios/RazorpayCheckout.h',
      'ios/RazorpayCheckout.m',       # Same file, different compile flags!
      'ios/RazorpayEventEmitter.h',
      'ios/RazorpayEventEmitter.m'
    ]
    
    # Turbo-specific dependencies
    ss.dependency 'razorpay-turbo'
    
    # Turbo bridge specific configuration
    ss.pod_target_xcconfig = {
      'GCC_PREPROCESSOR_DEFINITIONS' => '$(inherited) RAZORPAY_TURBO_ENABLED=1 RAZORPAY_TURBO_BRIDGE=1',
      'OTHER_SWIFT_FLAGS' => '$(inherited) -DRAZORPAY_TURBO_ENABLED'
    }
  end

end