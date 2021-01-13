const webpack = require('webpack');
const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');

require('dotenv').config();

module.exports = merge(common, {
  mode: 'production',
  plugins: [
    new webpack.DefinePlugin({
      'process.env': {
        'N4J_HOST': JSON.stringify(process.env.N4J_HOST),
        'N4J_USER': JSON.stringify(process.env.N4J_USER),
        'N4J_PASS': JSON.stringify(process.env.N4J_PASS)
      }
    })
  ]
});