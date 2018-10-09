const blacklist = require('metro-config/src/defaults/blacklist');

module.exports = {
  resolver: {
    blacklistRE: blacklist([/Users\/n.ashashank\/Desktop\/example\/node_modules\/react-native-razorpay\/node_modules\/.*/])
  }
};