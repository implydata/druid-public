const process = require('process');
const path = require('path');
const webpack = require('webpack');
const postcssPresetEnv = require('postcss-preset-env');

const { version } = require('./package.json');

module.exports = {
  mode: process.env.NODE_ENV || 'development',
  entry: {
    console: './build/entry.js'
  },
  output: {
    path: path.resolve(__dirname, './public'),
    filename: `[name]-${version}.js`,
    chunkFilename: `[name]-${version}.js`
  },
  target: 'web',
  resolve: {
    extensions: ['.html', '.js', '.json', '.scss', '.css']
  },
  module: {
    rules: [
      {
        test: /\.(png|jpg)$/,
        loader: 'file-loader',
        options: {
          name: 'images/[name].[ext]'
        }
      }
    ]
  },

  plugins: [
    // From: https://stackoverflow.com/questions/25384360/how-to-prevent-moment-js-from-loading-locales-with-webpack/25426019#25426019
    new webpack.IgnorePlugin(/^\.\/locale$/, /moment$/)
  ]
};
