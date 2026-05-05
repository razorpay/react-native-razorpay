/**
 * React Native Configuration for react-native-razorpay
 * This file tells React Native and Expo about native module integration
 */

module.exports = {
  project: {
    ios: {},
    android: {},
  },
  dependency: {
    platforms: {
      ios: {
        podspecPath: 'react-native-razorpay.podspec',
      },
      android: {
        sourceDir: './android',
        packageInstance: 'new RazorpayPackage()',
      },
    },
    hooks: {
      prelink: 'scripts/prelink.js',
      postlink: 'scripts/postlink.js',
      postunlink: 'scripts/postunlink.js',
    },
  },
};
