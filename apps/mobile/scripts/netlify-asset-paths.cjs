/** Keep exported asset URLs and their output directories safe for Netlify uploads. */
module.exports = function netlifyAssetPaths(asset) {
  // Metro uses filesystem paths in development and on native. Only web exports
  // need a public path; Expo uses this value for both the URL and the copied file.
  if (!asset.httpServerLocation.includes('?export_path=')) return asset;

  return {
    ...asset,
    httpServerLocation: asset.httpServerLocation.replace(/\/\.pnpm(?=\/)/g, '/_pnpm'),
  };
};
