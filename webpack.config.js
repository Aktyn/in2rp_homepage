const webpack = require('webpack');
const path = require('path');
const autoprefixer = require('autoprefixer');

const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');
const RobotstxtPlugin = require("robotstxt-webpack-plugin").default;
const AppManifestWebpackPlugin = require('app-manifest-webpack-plugin');
const ServiceWorkerWebpackPlugin = require('serviceworker-webpack-plugin');

const isDevelopment = process.env.NODE_ENV !== 'production';

module.exports = {
    entry: {
        main: './src/index.tsx'
    },
    output: {
        filename: '[name].js',
        chunkFilename: '[name].js',
        path: path.resolve(__dirname, 'dist'),
    },
    mode: isDevelopment ? 'development' : 'production',
    devtool: isDevelopment && "source-map",
    devServer: {
        historyApiFallback: true,
        port: 3000,
        open: true
    },
    resolve: {
        extensions: ['.js', '.json', '.ts', '.tsx'],
    },

    optimization: isDevelopment ? undefined : {
        minimize: true,
        minimizer: [
            new UglifyJsPlugin({
                exclude: 'sw.js',
                uglifyOptions: {
                    output: {
                        comments: false
                    },
                    ie8: false,
                    toplevel: true
                }
            })
        ],
        splitChunks: {
            //chunks: 'all',
            automaticNameDelimiter: '-',

            cacheGroups: {
                styles: {
                    name: 'styles',
                    test: /\.s?css$/,
                    chunks: 'all',
                    // minChunks: 1,
                    priority: -1,
                    reuseExistingChunk: true,
                    enforce: true,
                }
            }
        }
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
                test: /\.(jpe?g|png|gif|svg|ttf)$/,
                use: [
                    {
                        loader: "file-loader",
                        options: {
                            attrs: ['img:src','link:href','image:xlink:href'],
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
                            webp: {
                                quality: 75
                            }
                        }
                    }
                ]
            },
            /*{//TODO - remove ttf-loader from npm packages
                test: /\.ttf$/,
                use: [{
                    loader: 'ttf-loader',
                    options: {
                        attrs: ['url'],
                        outputPath: 'static/',
                        useRelativePath: true,
                        // emitFile: true,
                        // name: './font/[hash].[ext]',
                        name: '[name].[ext]'
                    },
                }]
            }*/
        ],
    },

    plugins: [
        new webpack.DefinePlugin({
            _GLOBALS_: JSON.stringify({
                update_time: Date.now()
            })
        }),
        new MiniCssExtractPlugin({
            filename: "[name]-styles.css",
            chunkFilename: "[id].css"
        }),
        new HtmlWebpackPlugin({
            hash: isDevelopment,
            favicon: isDevelopment ? './src/img/favicon.png' : undefined,
            title: 'IN2RP',
            minify: !isDevelopment,
            template: './src/index.html',
            filename: './index.html',

            //inject: 'head',
        }),
        new AppManifestWebpackPlugin({
            logo: './src/img/favicon.png',
            output: '/mobile/',
            inject: !isDevelopment,
            persistentCache: false,
            emitStats: false,
            config: {
                appName: 'IN2RP', // Your application's name. `string`
                appDescription: 
                    'Strona stworzona na potrzeby najlepszego polskiego serwera Roleplay GTA V - IN2RP. Autor: Aktyn.',
                lang: 'pl',
                developerName: 'Aktyn', // Your (or your developer's) name. `string`
                developerURL: 'https://github.com/Aktyn', // Your (or your developer's) URL. `string`
                background: '#40535d', // Background colour for flattened icons. `string`
                theme_color: '#40535d', // Theme color for browser chrome. `string`
                display: 'standalone', // Android display: "browser" or "standalone". `string`
                orientation: 'any', // Android orientation: "portrait" or "landscape". `string`
                start_url: '/', // Android start application's URL. `string`
                version: '1.6', // Your application's version number. `number`
                logging: false, // Print logs to console? `boolean`
                icons: {
                    // Platform Options:
                    // - offset - offset in percentage
                    // - shadow - drop shadow for Android icons, available online only
                    // - background:
                    //   * false - use default
                    //   * true - force use default, e.g. set background for Android icons
                    //   * color - set background for the specified icons
                    //
                    android: true,
                    appleIcon: true,
                    appleStartup: true,
                    coast: { offset: 25 },
                    favicons: true,
                    firefox: true,
                    windows: true,
                    yandex: false,
                },
            }
        }),
        new RobotstxtPlugin({
            policy: [{
                userAgent: "*",
                //allow: "/",
                disallow: ["/wl_requests", "/logs_mng", "/admins_mng", "/statistics", "/snake"],
                crawlDelay: 1,//seconds (useful for sites with huge amount of pages)
            }],
            host: "https://in2rp.pl"
        }),
        new ServiceWorkerWebpackPlugin({
            entry: path.join(__dirname, 'src', 'sw.js'),
        }),
    ]
};
