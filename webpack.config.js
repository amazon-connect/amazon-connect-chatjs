const path = require("path");
const webpack = require("webpack");

module.exports = {
  entry: "./src/index",
  mode: "development",
  devtool: "inline-source-map",
  output: {
    filename: "amazon-connect-chatjs.js",
    library: "connectchatjs",
    path: path.resolve(__dirname, "dist")
  },
  resolve: {
    extensions: [".js"]
  },
  module: {
    rules: [
      {
        test: /\.(js|ts)$/,
        enforce: "pre",
        use: [
          {
            options: {
              formatter: require("eslint/lib/formatters/stylish"),
              eslintPath: require.resolve("eslint")
            },
            loader: require.resolve("eslint-loader")
          }
        ],
        exclude: /node_modules/
      },

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

  devServer: {
    contentBase: [
      path.resolve(__dirname, "showcase"),
      path.resolve(__dirname, "dist"),
      path.resolve(__dirname, "src")
    ],
    compress: false,
    hot: true,
    watchContentBase: true
  },
  plugins: [
    new webpack.ProvidePlugin({
      paho: "paho-client"
    })
  ]
};
