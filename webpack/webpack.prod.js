const path = require('path');
const webpack = require('webpack');
const loaders = require('./loaders.js');
const plugins = require('./plugins');

module.exports = {
  entry: {
    app: './src/js/app.js',
  },
  output: {
    filename: 'js/[name].bundle.js',
    path: path.resolve(__dirname, '../dist/public')
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
  mode: 'production',
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
    new webpack.ProgressPlugin(),
    plugins.ESLintPlugin,
    plugins.StyleLintPlugin,
    plugins.MiniCssExtractPlugin,
    plugins.ImageMinPlugin,
  ]
};
