const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');
const loaders = require('./loaders.js');

module.exports = merge(common, {
  mode: 'production',
  devtool: 'source-map',
  module: {
    rules: [
      loaders.CSSLoaderProd,
      loaders.JSLoader,
      loaders.FileLoader,
      loaders.FontLoader,
    ]
  },
});
