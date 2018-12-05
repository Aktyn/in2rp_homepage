const path = require('path');
// const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const autoprefixer = require('autoprefixer');

const isDevelopment = process.env.NODE_ENV !== 'production';

module.exports = {
    entry: {
        main: './src/index.tsx',
    },
    output: {
        filename: '[name].js',
        path: path.resolve(__dirname, 'dist'),
    },
    mode: 'development',
    devtool: isDevelopment && "source-map",
    devServer: {
        historyApiFallback: true,
        port: 3000,
        open: true
    },
    resolve: {
        extensions: ['.js', '.json', '.ts', '.tsx'],
    },

    module: {
        rules: [
            {
                test: /\.(ts|tsx)$/,
                loader: 'awesome-typescript-loader',
            },
            { 
                test: /\.handlebars$/, 
                loader: "handlebars-loader" 
            },
            {
                test: /\.(scss|css)$/,
                use: [
                    MiniCssExtractPlugin.loader,
                    {
                        loader: "css-loader",
                        options: {
                            sourceMap: isDevelopment,
                            minimize: !isDevelopment
                        }
                    },
                    {
                        loader: "postcss-loader",
                        options: {
                            autoprefixer: {
                                browsers: 'last 2 versions, > 1%'
                            },
                            sourceMap: isDevelopment,
                            plugins: () => [
                                autoprefixer
                            ]
                        },
                    },
                    {
                        loader: "sass-loader",
                        options: {
                            sourceMap: isDevelopment
                        }
                    }
                ]
            },
            {
                test: /\.(jpe?g|png|gif|svg)$/,
                use: [
                    {
                        loader: "file-loader",
                        options: {
                            name: '[name].[ext]',
                            outputPath: 'static/',
                            useRelativePath: true,
                        }
                    },
                    {
                        loader: 'image-webpack-loader',
                        options: {
                          mozjpeg: {
                            progressive: true,
                            quality: 90
                          },
                          optipng: {
                            enabled: true,
                          },
                          pngquant: {
                            quality: '80-90',
                            speed: 4
                          },
                          gifsicle: {
                            interlaced: false,
                          },
                          /*webp: {
                            quality: 75
                          }*/
                        }
                    }
                ]
            }
        ],
    },

    plugins: [
        new MiniCssExtractPlugin({
            filename: "[name]-styles.css",
            chunkFilename: "[id].css"
        }),
        new HtmlWebpackPlugin({
            hash: isDevelopment,
            favicon: './src/img/in2rpp.png',
            title: 'IN2RP - GTA RolePlay Server',
            minify: !isDevelopment,
            template: './src/index.html',
            filename: './index.html'
        })
      ]
};
