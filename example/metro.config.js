const path = require('path');
  const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

  const projectRoot = __dirname;
  const moduleRoot = path.resolve(__dirname, '..');

  module.exports = mergeConfig(getDefaultConfig(projectRoot), {
    watchFolders: [moduleRoot],
    resolver: {
      blockList: [
        // ignore the lib’s own node_modules to prevent duplicates
        new RegExp(`^${path.resolve(moduleRoot, 'node_modules').replace(/[/\\]/g, '[\\\\/]')}.*`),
      ],
      extraNodeModules: {
        'react-native-razorpay': moduleRoot,
        react: path.join(projectRoot, 'node_modules/react'),
        'react-native': path.join(projectRoot, 'node_modules/react-native'),
      },
    },
  });