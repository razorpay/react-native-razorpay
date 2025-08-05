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
end

# Convenience function for auto-detection
def use_razorpay_react_native_auto!()
  # Read RAZORPAY_TURBO from .razorpay.env file (inlined for simplicity)
  env_path = File.join(__dir__, '..', '..', '..', '.razorpay.env')
  turbo_enabled = false
  
  if File.exist?(env_path)
    File.readlines(env_path).each do |line|
      line = line.strip
      next if line.start_with?('#') || line.empty?
      
      key, value = line.split('=', 2)
      if key&.strip == 'RAZORPAY_TURBO' && value
        turbo_enabled = value.strip.downcase == 'true'
        break
      end
    end
  end
  
  puts "🔍 Auto-detected Turbo setting: #{turbo_enabled}"
  use_razorpay_react_native!(turbo: turbo_enabled)
end

# Backward-compatible stub for existing Podfiles
def configure_razorpay_preprocessor_flags(installer)
  puts "ℹ️  configure_razorpay_preprocessor_flags is deprecated."
  puts "   └─ Subspecs now handle all configuration automatically!"
  puts "   └─ You can safely remove this post_install call from your Podfile."
  
  # Show which targets are being configured by subspecs
  installer.pods_project.targets.each do |target|
    if target.name.include?('react-native-razorpay')
      puts "   └─ Found target: #{target.name} (auto-configured by subspec)"
    end
  end
end 