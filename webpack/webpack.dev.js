const path = require('path');
const webpack = require('webpack');
const loaders = require('./loaders');
const plugins = require('./plugins');
const Dotenv = require('dotenv-webpack');

module.exports = {
  entry: {
    // app: ['webpack-hot-middleware/client?path=/__webpack_hmr&timeout=20000', './src/js/app.js'],
    app: './src/js/app.js'
  },
  output: {
    filename: 'js/[name].bundle.js',
    path: path.resolve(__dirname, '../dist/public'),
    publicPath: '/',
  },
  target: 'web',
  node: {
    fs: 'empty',
  },
  optimization: {
    splitChunks: {
      chunks: 'all',
    },
    runtimeChunk: 'multiple',
  },
  mode: 'development',
  devtool: 'source-map',
  module: {
    rules: [
      loaders.CSSLoader,
      loaders.JSLoader,
      loaders.FileLoader,
      // loaders.FontLoader,
      loaders.ViewLoader,
    ]
  },
  plugins: [
    // new webpack.ProgressPlugin(),
    // new webpack.HotModuleReplacementPlugin(),
    new webpack.NoEmitOnErrorsPlugin(),
    new Dotenv(),
    // plugins.ESLintPlugin,
    // plugins.StyleLintPlugin,
    plugins.MiniCssExtractPlugin,
  ]
};
