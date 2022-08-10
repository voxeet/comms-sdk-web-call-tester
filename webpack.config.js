const path = require('path');
const CopyWebpackPlugin = require("copy-webpack-plugin");
const HtmlWebpackPlugin = require('html-webpack-plugin');

try {
  require('os').networkInterfaces()
} catch (e) {
  require('os').networkInterfaces = () => ({})
}

module.exports = {
  entry: [
    './src/index.js',
  ],
  devServer: {
    port: 8081,
    https: false,
    host: 'localhost',
    webSocketServer: 'ws',
  },
  module: {
    rules: [
      {
        test: /.less$/,
        use: ['style-loader', 'css-loader', 'less-loader'],
      },
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
        },
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"]
      },
      {
        test: /\.ttf(\?v=\d+\.\d+\.\d+)?$/,
        use: "url-loader?limit=10000&mimetype=application/octet-stream"
      }, {
        test: /\.eot(\?v=\d+\.\d+\.\d+)?$/,
        use: "file-loader"
      }, {
        test: /\.svg(\?v=\d+\.\d+\.\d+)?$/,
        use: "url-loader?limit=10000&mimetype=image/svg+xml"
      }, {
        test: /\.(jpg|jpeg|gif|png)$/,
        exclude: /node_modules/,
        use: 'url-loader?limit=65000&name=images/[name].[ext]'
      }
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      inject: true,
      template: './public/index.html'    
    }),
    new CopyWebpackPlugin({
      patterns:[
       { from: "./node_modules/@voxeet/voxeet-web-sdk/dist/dvwc_impl.wasm", noErrorOnMissing: true },
       { from: "./node_modules/@voxeet/voxeet-web-sdk/dist/voxeet-dvwc-worker.js", noErrorOnMissing: true },
       { from: "./node_modules/@voxeet/voxeet-web-sdk/dist/voxeet-worklet.js", noErrorOnMissing: true },
     ]
    }),
  ]
};
