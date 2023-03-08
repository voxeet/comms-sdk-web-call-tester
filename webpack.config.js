const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');

try {
  require('os').networkInterfaces()
} catch (e) {
  require('os').networkInterfaces = () => ({})
}

module.exports = {
  entry: './src/index.tsx',
  output: {
    path: path.resolve(__dirname, 'dist', 'host'),
    filename: 'bundle.js',
  },
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx'],
    plugins: [
      new TsconfigPathsPlugin({
        configFile: './tsconfig.json',
      }),
    ],
  },
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
        test: /\.(ts|tsx)$/,
        exclude: /node_modules/,
        use: {
            loader: 'babel-loader',
        },
      },
      {
        test: /\.svg(\?v=\d+\.\d+\.\d+)?$/,
        use: "url-loader?limit=10000&mimetype=image/svg+xml"
      },
      {
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
  ]
};
