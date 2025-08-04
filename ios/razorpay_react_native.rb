def use_razorpay_react_native!(turbo: false)
  # Always include the base Razorpay pod
  pod 'razorpay-pod'
  
  # Conditionally include Turbo pod
  if turbo
    pod 'razorpay-turbo/standard'
    puts "✅ Razorpay Turbo enabled in Podfile"
  else
    puts "ℹ️  Razorpay Turbo disabled in Podfile"
  end
  
  # Include the React Native wrapper
  pod 'react-native-razorpay', :path => '../node_modules/react-native-razorpay'
  
  # Store turbo setting for post_install configuration
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

# Post-install hook to configure preprocessor definitions and framework search paths
def configure_razorpay_preprocessor_flags(installer)
  # Only run if Razorpay was configured
  return unless defined?($razorpay_turbo_enabled)
  
  puts "🔧 Configuring Razorpay preprocessor flags..."
  
  installer.pods_project.targets.each do |target|
    # Apply to react-native-razorpay target
    if target.name == 'react-native-razorpay'
      target.build_configurations.each do |config|
        # Add framework search paths for Turbo
        if $razorpay_turbo_enabled
          frameworks = config.build_settings['FRAMEWORK_SEARCH_PATHS'] ||= ['$(inherited)']
          
          # Add both core and ui paths (matching razorpay-turbo target config)
          turbo_core_path = '"${PODS_ROOT}/razorpay-turbo/Pod/core"'
          turbo_ui_path = '"${PODS_ROOT}/razorpay-turbo/Pod/ui"'
          
          unless frameworks.include?(turbo_core_path)
            frameworks << turbo_core_path
            puts "  ✅ Added Turbo CORE framework path to #{target.name}"
          end
          
          unless frameworks.include?(turbo_ui_path)  
            frameworks << turbo_ui_path
            puts "  ✅ Added Turbo UI framework path to #{target.name}"
          end
        end
        
        # Add/remove preprocessor definitions
        definitions = config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] ||= ['$(inherited)']
        
        if $razorpay_turbo_enabled
          unless definitions.include?('RAZORPAY_TURBO_ENABLED=1')
            definitions << 'RAZORPAY_TURBO_ENABLED=1'
            puts "  ✅ Added RAZORPAY_TURBO_ENABLED=1 to #{target.name}"
          end
        else
          # Remove the flag if it exists and turbo is disabled
          definitions.delete('RAZORPAY_TURBO_ENABLED=1')
          puts "  ❌ Removed RAZORPAY_TURBO_ENABLED flag from #{target.name}"
        end
        
        config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] = definitions
      end
    end
  end
end 