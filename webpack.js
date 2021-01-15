const { CleanWebpackPlugin } = require('clean-webpack-plugin')
const Dotenv = require('dotenv-webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const path = require('path');
const webpack = require('webpack');

require('dotenv').config();

const devMode = process.env.NODE_ENV !== 'production';
console.log(devMode)

const buildDir = path.join(__dirname, 'build');

const plugins = [
  new CleanWebpackPlugin(),
  new HtmlWebpackPlugin({
    template: 'src/index.html',
    title: 'Production'
  })
];
if(!devMode) {
  // Only enabled in production environment
  plugins.push(
    new MiniCssExtractPlugin({
      filename: '[name].[contenthash].css',
      chunkFilename: '[id].[contenthash].css'
    }),
    new webpack.DefinePlugin({
      'process.env': {
        'N4J_HOST': JSON.stringify(process.env.N4J_HOST),
        'N4J_USER': JSON.stringify(process.env.N4J_USER),
        'N4J_PASS': JSON.stringify(process.env.N4J_PASS)
      }
    })
  )
} else {
  plugins.push(
    new Dotenv()
  )
}

module.exports = {
  mode: devMode ? 'development' : 'production',
  entry: {
    app: './src/app.js',
    neo4j: './src/scripts/neo4j.js',
  },
  optimization: {
    splitChunks: {
      chunks: 'all',
    }
  },
  plugins,
  output: {
    filename: '[name].bundle.js',
    path: buildDir,
  },
  resolve: {
    extensions: ['.webpack.js', '.web.js', '.js', '.jsx']
  },
  devtool: 'inline-source-map',
  devServer: {
    contentBase: buildDir,
  },
  stats: {
    colors: true,
    reasons: true
  },
  module: {
    rules: [
      {
        test: /\.s[ac]ss$/i,
        use: [
          devMode ? 'style-loader' : MiniCssExtractPlugin.loader,
          'css-loader',
          'postcss-loader',
          'sass-loader',
        ],
      },
      {
        test: /\.jpe?g$|\.ico$|\.gif$|\.png$|\.svg$|\.woff$|\.ttf$|\.wav$|\.mp3$/,
        loader: 'file-loader?name=[name].[ext]'  // <-- retain original file name
    }
    ]
  }
};