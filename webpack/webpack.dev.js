const path = require('path');
const webpack = require('webpack'); // to access built-in plugins
const HtmlWebpackPlugin = require('html-webpack-plugin');
const loaders = require('./loaders');
const plugins = require('./plugins');
const Dotenv = require('dotenv-webpack');

module.exports = {
  entry: {
    app: ['webpack-hot-middleware/client?path=/__webpack_hmr&timeout=20000', './src/js/app.js'],
    neo4j: ['webpack-hot-middleware/client?path=/__webpack_hmr&timeout=20000', './src/js/neo4j.js']
  },
  output: {
    filename: 'js/[name].[hash].bundle.js',
    path: path.resolve(__dirname, '../dist'),
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
  plugins: [
    new webpack.ProgressPlugin(),
    new HtmlWebpackPlugin({
      filename: 'index.html',
      template: './src/index.html',
      excludeChunks: ['server']
    }),
    new webpack.NoEmitOnErrorsPlugin(),
    new webpack.HotModuleReplacementPlugin(),
    // new webpack.DefinePlugin({
    //   "process.env": dotenv.parsed
    // }),
    new Dotenv(),
    new webpack.EnvironmentPlugin({
      'NEO4J_PASSWORD': 'abcde'
    }),
    plugins.ESLintPlugin,
    plugins.StyleLintPlugin,
    plugins.MiniCssExtractPlugin,
  ]
};
