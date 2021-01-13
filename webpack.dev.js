const { merge } = require('webpack-merge');
const { devServer } = require('./webpack.common.js');
const Dotenv = require('dotenv-webpack');
const common = require('./webpack.common.js');

require('dotenv').config();

module.exports = merge(common, {
  mode: 'development',
  devtool: 'inline-source-map',
  devServer: {
    contentBase: common.buildDir,
  },
  stats: {
    colors: true,
    reasons: true
  },
  plugins: [
    new Dotenv(),
  ]
});