const path = require('path');
const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');
const loaders = require('./loaders');

module.exports = merge(common, {
  mode: 'development',
  devtool: 'source-map',
  devServer: {
    contentBase: path.join(__dirname, 'build')
  },
  module: {
    rules: [
      loaders.CSSLoaderDev,
      loaders.JSLoader,
      loaders.FileLoader,
      loaders.FontLoader,
    ]
  },
});
