const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Netlify excludes hidden directories, including pnpm's .pnpm asset paths.
config.transformer.assetPlugins.push(require.resolve('./scripts/netlify-asset-paths.cjs'));

module.exports = config;
