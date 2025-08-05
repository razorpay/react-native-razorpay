require_relative '../node_modules/react-native/scripts/react_native_pods'
require_relative '../node_modules/react-native/scripts/cocoapods/autolinking'

# Add Razorpay Turbo configuration
require_relative '../node_modules/react-native-razorpay/ios/razorpay_react_native'

platform :ios, '15.1'
install! 'cocoapods', :deterministic_uuids => false

target 'SampleApp' do
  config = use_native_modules!

  # Flags change depending on the env values.
  flags = get_default_flags()

  use_react_native!(
    :path => config[:reactNativePath],
    # Hermes is now the default. Disable by setting this flag to false.
    :hermes_enabled => flags[:hermes_enabled],
    :fabric_enabled => flags[:fabric_enabled],
    # An absolute path to your application root.
    :app_path => "#{Pod::Config.instance.installation_root}/.."
  )

  # Add Razorpay with automatic Turbo detection
  use_razorpay_react_native_auto!()

  target 'SampleAppTests' do
    inherit! :complete
    # Pods for testing
  end

  post_install do |installer|
    # https://github.com/facebook/react-native/blob/main/packages/react-native/scripts/react_native_pods.rb#L197-L202
    react_native_post_install(
      installer,
      config[:reactNativePath],
      :mac_catalyst_enabled => false,
      # Set `mac_catalyst_enabled` to `true` in order to apply patches
      # necessary for Mac Catalyst builds
    )
    
    # Configure Razorpay preprocessor flags
    
    # Set deployment target for all pods
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '15.1'
      end
    end
  end
end 