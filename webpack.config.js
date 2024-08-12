const path = require("path");
const webpack = require("webpack");
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: "./src/index",
  mode: "development",
  devtool: "source-map",
  node: {
    global: false
  },
  output: {
    filename: "amazon-connect-chat.js",
    path: path.resolve(__dirname, "dist")
  },
  resolve: {
    extensions: [".js"]
  },
  module: {
    rules: [
      {
        test: /\.(js|mjs|jsx|ts|tsx)$/,
        exclude: /node_modules/,
        loader: require.resolve("babel-loader"),
        options: {
          // This is a feature of `babel-loader` for webpack (not Babel itself).
          // It enables caching results in ./node_modules/.cache/babel-loader/
          // directory for faster rebuilds.
          cacheDirectory: true,
          // Don't waste time on Gzipping the cache
          cacheCompression: false
        }
      }
    ]
  },

  plugins: [
    new CopyWebpackPlugin({
        patterns: [
          { 
            from: path.resolve(__dirname, "src/index.d.ts"),
            to: path.resolve(__dirname, "dist")
          }
        ]
    })
  ],

  devServer: {
    compress: false,
    hot: true,
    static: {
      directory: path.resolve(__dirname, "showcase"),
      watch: true
    }
  }
};
