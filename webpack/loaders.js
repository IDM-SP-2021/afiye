const path = require('path');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

const HTMLLoader = {
  test: /\.html$/i,
  use: ['file-loader?name=[name].[ext]', 'extract-loader', 'html-loader'],
};

const CSSLoader = {
  test: /\.s[ac]ss$/i,
  exclude: /node_modules/,
  use: [
    {
      loader: MiniCssExtractPlugin.loader,
      options: {
        publicPath: path.resolve(__dirname, '../dist/css/')
      }
    },
    {
      loader: 'css-loader',
      options: {importLoaders: 1},
    },
    {
      loader: 'postcss-loader',
      options: {
        postcssOptions: {
          config: path.resolve(__dirname, 'postcss.config.js'),
        },
      },
    },
    'sass-loader',
  ],
};

const JSLoader = {
  test: /\.js$/i,
  exclude: /node_modules/,
  use: {
    loader: 'babel-loader',
    options: {
      presets: ['@babel/preset-env']
    }
  }
};

const FileLoader = {
  test: /\.(png|jpe?g|gif)$/i,
  use: [
    {
      loader: 'file-loader',
      options: {
        outputPath: 'images',
        publicPath: path.resolve(__dirname, 'dist/')
      },
    },
  ],
};


module.exports = {
  HTMLLoader: HTMLLoader,
  CSSLoader: CSSLoader,
  JSLoader: JSLoader,
  FileLoader: FileLoader,
};