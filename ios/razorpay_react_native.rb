def use_razorpay_react_native!(turbo: false)
  # Always include the base Razorpay pod
  pod 'razorpay-pod'
  
  # Conditionally include Turbo pod and choose appropriate subspec
  if turbo
    pod 'razorpay-turbo/standard'
    # Use TurboBridge subspec - gets RAZORPAY_TURBO_ENABLED=1 automatically
    pod 'react-native-razorpay/TurboBridge', :path => '../node_modules/react-native-razorpay'
    puts "✅ Razorpay Turbo enabled - using TurboBridge subspec"
  else
    # Use StandardBridge subspec - clean build without Turbo dependencies
    pod 'react-native-razorpay/StandardBridge', :path => '../node_modules/react-native-razorpay'
    puts "ℹ️  Razorpay Standard mode - using StandardBridge subspec"
  end
  
  # Store turbo setting for any additional post_install needs
  $razorpay_turbo_enabled = turbo
end

def read_env_flag(key, default = nil)
  # Look for .razorpay.env in the project root (three levels up from node_modules/react-native-razorpay/ios/)
  path = File.join(__dir__, '..', '..', '..', '.razorpay.env')
  return default unless File.exist?(path)
  
  File.readlines(path).each do |line|
    line = line.strip
    next if line.start_with?('#') || line.empty?
    
    k, v = line.split('=', 2)
    if k && v && k.strip == key
      return v.strip.downcase == 'true'
    end
  end
  
  default
end

# Convenience function for auto-detection
def use_razorpay_react_native_auto!()
  turbo_enabled = read_env_flag('RAZORPAY_TURBO', false)
  puts "🔍 Auto-detected Turbo setting: #{turbo_enabled}"
  use_razorpay_react_native!(turbo: turbo_enabled)
end

# Simplified post-install hook - subspecs handle most configuration automatically
def configure_razorpay_preprocessor_flags(installer)
  # Only run if Razorpay was configured
  return unless defined?($razorpay_turbo_enabled)
  
  puts "🔧 Razorpay configuration complete via subspecs!"
  puts "   └─ #{$razorpay_turbo_enabled ? 'TurboBridge' : 'StandardBridge'} subspec is handling flags automatically"
  
  # Optional: Add any additional custom configuration here if needed
  # Most configuration is now handled by the subspec's pod_target_xcconfig
  
  installer.pods_project.targets.each do |target|
    if target.name.include?('react-native-razorpay')
      puts "   └─ Found target: #{target.name} (configured by subspec)"
    end
  end
end 