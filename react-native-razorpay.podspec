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
  s.source_files  = "ios/**/*.{h,m}"

  s.dependency 'React'
  # s.dependency 'razorpay-pod'
  s.vendored_frameworks = 'ios/Pod/Razorpay.xcframework'

end