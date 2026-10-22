const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const defaultConfig = getDefaultConfig(__dirname);

const config = {
  resolver: {
    assetExts: Array.from(
      new Set([...(defaultConfig.resolver?.assetExts ?? []), 'mp4', 'MP4']),
    ),
  },
};

module.exports = mergeConfig(defaultConfig, config);
