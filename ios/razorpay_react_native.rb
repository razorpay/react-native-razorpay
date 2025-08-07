def use_razorpay_react_native!(turbo: false)
  # Always include the base Razorpay pod
  pod 'razorpay-pod'
  # pod 'netfox'
  # Conditionally include Turbo pod and choose appropriate subspec
  if turbo
    pod 'razorpay-turbo/standard'
    pod 'react-native-razorpay/Turbo', :path => '../node_modules/react-native-razorpay'
    puts "✅ Razorpay Turbo enabled"
  else
    pod 'react-native-razorpay/Standard', :path => '../node_modules/react-native-razorpay'
  end
end

# Convenience function for auto-detection
def use_razorpay_react_native_auto!()
  # Read RAZORPAY_TURBO from .razorpay.env file
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
  
  use_razorpay_react_native!(turbo: turbo_enabled)
end

