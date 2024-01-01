const autoprefixer = require('autoprefixer');
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");
const ESLintPlugin = require('eslint-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const TerserPlugin = require('terser-webpack-plugin');

// TODO Take a look at
// https://github.com/fqborges/webpack-fix-style-only-entries
// for getting rid of superfluous JS files when only importing CSS files.

// TODO Add `include` directory to everything, and print warning when it is missing.
// https://webpack.js.org/guides/build-performance/#loaders

exports.devServer = function({
  // Using 0.0.0.0 is necessary for hosting from inside Docker.
  // See https://webpack.js.org/configuration/dev-server/#devserverhost
  host = '0.0.0.0',
  port = 8080,
  ...options
}) {
  // See https://webpack.js.org/guides/development/#using-webpack-dev-server
  return {
    devServer: {
      host,
      port,
      // Disable hot module reloading (HMR), because it does not live-reload
      // HTML templates properly. (This took a really long time to figure out.)
      hot: false,
      client: {
        // Show errors but not warnings in the browser.
        // See https://webpack.js.org/configuration/dev-server/#overlay
        overlay: {
          errors: true,
          warnings: false,
          runtimeErrors: true
        }
      },
      // Don't use the .html suffix in URLs. Automatically route URLs ending
      // in / to an index.html file, and all other URLs to a .html file.
      historyApiFallback: {
        rewrites: [
          { from: /^.*\/$/, to: c => `${c.match[0]}index.html` },
          { from: /^.*$/, to: c => `${c.match[0]}.html` }
        ]
      },
      ...options
    }
  };
};

exports.loadCSS = function(options) {
  return loadCSS({
    ...options,
    test: /\.css$/,
    additionalLoaders: []
  });
};

exports.loadSass = function({
  allowCSS = true,
  ...options
}) {
  // NOTE There is an issue when using `thread-loader`.
  // See https://webpack.js.org/guides/build-performance/#sass
  // NOTE It is possible to inject variables using `additionalData`.
  // See https://github.com/webpack-contrib/sass-loader?tab=readme-ov-file#additionaldata
  return loadCSS({
    ...options,
    test: allowCSS ? /\.s?css$/ : /\.scss$/,
    additionalLoaders: [
      {
        // Treat file paths in the Sass code as relative to the current Sass
        // file.
        loader: 'resolve-url-loader',
        options: {
          sourceMap: options.sourceMaps
        }
      },
      {
        loader: 'sass-loader',
        options: {
          // Source maps must always be activated because of
          // resolve-url-loader.
          // See https://www.npmjs.com/package/resolve-url-loader#configure-webpack
          sourceMap: true
        }
      }
    ]
  });
};

const _autoprefixer = autoprefixer;

// NOTE Autoprefixer automatically reads the file `.browserslistrc`.
function loadCSS({
  separateFile = true,
  autoprefixer = true,
  sourceMaps = true,
  minify = false,
  hash = false,
  postcssPlugins = [],
  test,
  additionalLoaders
}) {
  // See https://webpack.js.org/guides/asset-management/#loading-css
  // See https://webpack.js.org/plugins/mini-css-extract-plugin/
  // If autoprefixer is needed, add it to the list of postcss plugins.
  if(autoprefixer) {
    postcssPlugins = [
      _autoprefixer(),
      ...postcssPlugins
    ];
  }
  // If there are any postcss plugins, add the postcss loader.
  if(postcssPlugins.length > 0) {
    additionalLoaders = [
      {
        loader: 'postcss-loader',
        options: {
          postcssOptions: {
            plugins: postcssPlugins
          },
          sourceMap: sourceMaps
        }
      },
      ...additionalLoaders
    ];
  }
  const loaders = [
    separateFile ? MiniCssExtractPlugin.loader : 'style-loader',
    {
      loader: 'css-loader',
      options: {
        sourceMap: sourceMaps,
        // See https://github.com/webpack-contrib/mini-css-extract-plugin/issues/49
        // and https://webpack.js.org/loaders/css-loader/#importloaders
        importLoaders: additionalLoaders.length
      }
    },
    ...additionalLoaders
  ];
  const plugins = [];
  if(separateFile) {
    plugins.push(new MiniCssExtractPlugin({
      filename: hash ? '[name].[contenthash:8].css' : '[name].css',
      chunkFilename: hash ? '[id].[contenthash:8].css' : '[id].css'
    }));
  }
  let minifyOptions;
  if(minify) {
    // https://webpack.js.org/plugins/mini-css-extract-plugin/#minimizing-for-production
    minifyOptions = {
      optimization: {
        minimizer: [
          new CssMinimizerPlugin({
            minimizerOptions: {
              preset: [
                'default',
                {
                  discardComments: {
                    removeAll: true
                  }
                }
              ]
            }
          })
        ]
      }
    };
  } else {
    minifyOptions = {};
  }
  return {
    module: {
      rules: [
        {
          test,
          use: loaders
        }
      ]
    },
    plugins,
    ...minifyOptions
  };
}

exports.loadJavaScript = function({
  include,
  exclude,
  cacheBabel = false,
  sourceMaps = true,
  minify = false,
  hash = false,
  polyfill = false,
  lint = true,
  cacheEslint = false,
  eslintOptions = {}
}) {
  // If polyfill is true, the following package is required:
  //     npm install --save @babel/runtime-corejs3
  // If polyfill is false, the following package is required:
  //     npm install --save @babel/runtime
  const result = {
    module: {
      rules: [
        {
          test: /\.js$/,
          include,
          exclude,
          use: [
            {
              loader: 'babel-loader',
              options: {
                sourceMaps: sourceMaps,
                presets: [
                  [
                    '@babel/preset-env',
                    {
                      // This sets the browser compatibility level to the
                      // default settings used by browserslist.
                      // See https://babeljs.io/docs/options#no-targets
                      targets: 'defaults'
                      // Because plugin-transform-runtime is used, the option
                      // useBuiltIns must not be used here.
                    }
                  ]
                ],
                // This factors out some of Babel's boilerplate code into a
                // single module.
                // It also takes care of polyfilling ES6 constants and methods,
                // and it does so in a way that does not pollute the global
                // namespace.
                // See https://webpack.js.org/loaders/babel-loader/#babel-is-injecting-helpers-into-each-file-and-bloating-my-code
                // See https://babeljs.io/docs/babel-plugin-transform-runtime/
                plugins: [
                  [
                    '@babel/plugin-transform-runtime',
                    {
                      corejs: 3
                    }
                  ]
                ],
                cacheDirectory: cacheBabel
              }
            }
          ]
        }
      ]
    },
    output: {
      // See https://webpack.js.org/guides/caching/#output-filenames
      filename: hash ? '[name].[contenthash:8].js' : '[name].js',
      // TODO Is there a way to use just the hash and no id? The id is very
      // long.
      chunkFilename: hash ? '[id].[contenthash:8].js' : '[id].js'
    },
    optimization: {
      minimize: minify
    }
  };
  if(lint) {
    result.plugins = [
      new ESLintPlugin({
        cache: cacheEslint,
        context: '/',
        files: include,
        ...eslintOptions
      })
    ];
  }
  if(minify) {
    // See https://webpack.js.org/guides/production/#minification
    result.optimization.minimizer = [
      new TerserPlugin({
        // Use esbuild, which is a fast minifier that preserves special
        // comments.
        // See https://webpack.js.org/plugins/terser-webpack-plugin/#esbuild
        minify: TerserPlugin.esbuildMinify,
        // TODO Make sure source maps work
        // https://github.com/terser/terser?tab=readme-ov-file#source-map-options
      })
    ];
  }
  return result;
};

exports.loadImages = function({
  optimize = true,
  optimizeJpeg = true,
  losslessJpeg = true,
  jpegQuality,
  progressiveJpeg = true,
  optimizePng = true,
  losslessPng = true,
  pngQuality,
  interlacePng = false,
  removePngMetadata = true,
  optimizeSvg = true,
  optimizeGif = true,
  interlaceGif = false,
  ...options
}) {
  // TODO Change package for optimizing images
  // See https://webpack.js.org/guides/asset-management/#loading-images
  const imageLoaderOptions = {
    mozjpeg: {
      enabled: optimizeJpeg,
      quality: losslessJpeg ? 100 : jpegQuality,
      progressive: progressiveJpeg
    },
    optipng: {
      enabled: optimizePng || interlacePng,
      optimizationLevel: 0,
      bitDepthReduction: false,
      colorTypeReduction: false,
      paletteReduction: false,
      interlaced: interlacePng
    },
    pngquant: {
      enabled: optimizePng,
      strip: removePngMetadata,
      quality: losslessPng ? [1, 1] : pngQuality,
      dithering: losslessPng ? false : 1
    },
    svgo: {
      enabled: optimizeSvg
    },
    gifsicle: {
      enabled: optimizeGif,
      interlaced: interlaceGif,
      optimizationLevel: 3
    }
  };
  return loadFiles({
    ...options,
    test: /\.(gif|png|jpe?g|svg|webp)$/,
    additionalLoaders: optimize ?
      [
        {
          loader: 'image-webpack-loader',
          options: imageLoaderOptions
        }
      ] :
      []
  });
};

exports.loadFonts = function(options) {
  // See https://webpack.js.org/guides/asset-management/#loading-fonts
  return loadFiles({
    ...options,
    test: /\.(ttf|eot|woff2?|svg(#.*?)?)$/,
    additionalLoaders: []
  });
};

function loadFiles({
  test,
  include,
  exclude,
  inlineSizeLimit,
  neverInline = false,
  alwaysInline = false,
  hash = true,
  additionalLoaders = [],
  outputPath = '[path]'
}) {
  if(neverInline && alwaysInline) {
    throw new Error('neverInline and alwaysInline cannot both be true');
  }
  let assetOptions;
  if(alwaysInline) {
    assetOptions = { type: 'asset/inline' };
  } else {
    const outputOptions = {
      generator: {
        filename: outputPath + (
          hash ?
          '[name].[hash:8][ext]' :
          '[name][ext]'
        )
      }
    };
    if(neverInline) {
      assetOptions = {
        type: 'asset/resource',
        ...outputOptions
      };
    } else {
      assetOptions = {
        type: 'asset',
        parser: {
          dataUrlCondition: {
            maxSize: inlineSizeLimit
          }
        },
        ...outputOptions
      };
    }
  }
  return {
    module: {
      rules: [
        {
          test,
          include,
          exclude,
          use: additionalLoaders,
          ...assetOptions
        }
      ]
    }
  };
};

exports.loadFiles = loadFiles;

exports.loadPug = function() {
  return {
    module: {
      rules: [
        {
          test: /\.pug$/,
          use: ['@webdiscus/pug-loader']
        }
      ]
    }
  };
};

exports.loadHTML = function(options = {}) {
  return {
    module: {
      rules: [
        {
          test: /\.html$/,
          use: [
            {
              loader: 'html-loader',
              options
            }
          ]
        }
      ]
    }
  };
};

exports.page = function({
  outputName,
  template,
  chunks = [],
  minifyHtml = false,
  data = {},
  injectTags = false
}) {
  // See https://webpack.js.org/guides/output-management/#setting-up-htmlwebpackplugin
  // See https://github.com/jantimon/html-webpack-plugin/blob/main/examples/template-parameters/webpack.config.js
  // See https://github.com/jantimon/html-webpack-plugin?tab=readme-ov-file#writing-your-own-templates
  return {
    plugins: [
      new HtmlWebpackPlugin({
        filename: outputName,
        template: template,
        templateParameters: data,
        inject: injectTags,
        minify: minifyHtml ?
          // See https://github.com/terser/html-minifier-terser?tab=readme-ov-file#options-quick-reference
          {
            collapseBooleanAttributes: true,
            collapseWhitespace: true,
            // Important: collapse but do not completely remove runs of
            // whitespace or newlines, which could visually change the page.
            conservativeCollapse: true,
            preserveLineBreaks: true,
            decodeEntities: true,
            removeComments: true,
            removeRedundantAttributes: true,
            removeScriptTypeAttributes: true,
            removeStyleLinkTypeAttributes: true,
            sortAttributes: true,
            sortClassName: true
          } :
          false
      })
    ]
  };
};

exports.generateSourceMaps = function({ type }) {
  // See https://webpack.js.org/guides/development/#using-source-maps
  return { devtool: type };
};

exports.clean = function() {
  // See https://webpack.js.org/guides/output-management/#cleaning-up-the-dist-folder
  return {
    output: {
      clean: true
    }
  };
};
