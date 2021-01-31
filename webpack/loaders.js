const path = require('path');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

const HTMLLoader = {
  test: /\.html$/i,
  use: [
    'file-loader?name=[name].[ext]',
    'extract-loader',
    {
      loader: 'html-loader',
      options: { minimize: true },
    }
  ],
};

const CSSLoader = {
  test: /\.s[ac]ss$/i,
  exclude: /node_modules/,
  use: [
    {
      loader: MiniCssExtractPlugin.loader,
      options: {
        publicPath: path.resolve(__dirname, '../dist/css/'),
      }
    },
    {
      loader: 'css-loader',
      options: {
        importLoaders: 1,
        sourceMap: true,
      },
    },
    {
      loader: 'sass-loader',
      options: {
        sourceMap: true,
      }
    },
  ],
};

const JSLoader = {
  test: /\.js$/i,
  exclude: /node_modules/,
  use: {
    loader: 'babel-loader',
    options: {
      presets: ['@babel/preset-env']
    },
  },
};

const FileLoader = {
  test: /\.(png|jpe?g|gif|svg)$/i,
  exclude: /fonts/,
  use: [
    {
      loader: 'file-loader',
      options: {
        name: '[path][name].[ext]'
      }
    },
  ],
};

const FontLoader = {
  test: /\.(woff(2)?|ttf|eot|svg)(\?v=\d+\.\d+\.\d+)?$/,
  use: [
    {
      loader: 'file-loader',
      options: {
        name: '[name].[ext]',
        outputPath: 'fonts/'
      },
    },
  ],
};

const ViewLoader = {
  test: /\.ejs$/,
  use: [
    {
      loader: 'file-loader',
      options: {
        name: '[path][name].[ext]'
      }
    }
  ]
};

module.exports = {
  HTMLLoader: HTMLLoader,
  CSSLoader: CSSLoader,
  JSLoader: JSLoader,
  FileLoader: FileLoader,
  FontLoader: FontLoader,
  ViewLoader: ViewLoader,
};