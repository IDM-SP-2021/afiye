const path = require('path');
const webpack = require('webpack'); // to access built-in plugins
const HtmlWebpackPlugin = require('html-webpack-plugin');
const loaders = require('./loaders.js');
const plugins = require('./plugins');

module.exports = {
  entry: {
    app: './src/js/app.js',
    neo4j: './src/js/neo4j.js'
  },
  output: {
    filename: 'js/[name].[hash].bundle.js',
    path: path.resolve(__dirname, '../dist')
  },
  target: 'web',
  node: {
    fs: 'empty',
  },
  optimization: {
    splitChunks: {
      chunks: 'all',
    },
  },
  mode: 'production',
  devtool: 'source-map',
  module: {
    rules: [
      loaders.CSSLoaderProd,
      loaders.JSLoader,
      loaders.FileLoader,
      loaders.IconLoader,
      loaders.FontLoader,
    ]
  },
  plugins: [
    new webpack.ProgressPlugin(),
    new HtmlWebpackPlugin({
      filename: 'index.html',
      template: './src/index.html',
      excludeChunks: ['server']
    }),
    new webpack.DefinePlugin({
      'process.env': {
        'N4J_HOST': JSON.stringify(process.env.N4J_HOST),
        'N4J_USER': JSON.stringify(process.env.N4J_USER),
        'N4J_PASS': JSON.stringify(process.env.N4J_PASS)
      }
    }),
    plugins.ESLintPlugin,
    plugins.StyleLintPlugin,
    plugins.MiniCssExtractPlugin,
  ]
};
