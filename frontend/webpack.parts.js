const autoprefixer = require('autoprefixer');
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");
//const ESLintPlugin = require('eslint-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
//const UglifyWebpackPlugin = require('uglifyjs-webpack-plugin');

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
  // Show errors but not warnings in the browser.
  // See https://webpack.js.org/configuration/dev-server/#overlay
  overlay = {
    errors: true,
    warnings: false,
    runtimeErrors: true
  },
  ...options
}) {
  // See https://webpack.js.org/guides/development/#using-webpack-dev-server
  return {
    devServer: {
      host,
      port,
      overlay,
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
          // TODO Add option to inject variables using `additionalData`.
          // See https://github.com/webpack-contrib/sass-loader?tab=readme-ov-file#additionaldata
        }
      }
    ]
  });
};

const _autoprefixer = autoprefixer;

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
          plugins: postcssPlugins,
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
  sourceMaps = true,
  minify = false,
  hash = false,
  polyfill = false,
  lint = true,
  eslintOptions = {}
}) {
  const loaders = [
    {
      loader: 'babel-loader',
      options: {
        sourceMaps: sourceMaps,
        presets: [
          [
            '@babel/preset-env',
            {
              modules: false,
              useBuiltIns: polyfill ? 'usage' : false,
              corejs: 3
            }
          ]
        ]
      }
    }
  ];
  const result = {
    module: {
      rules: [
        {
          test: /\.js$/,
          include,
          exclude,
          use: loaders
        }
      ]
    }
  };
  if(lint) {
    result.plugins = [new ESLintPlugin({
      cache: true,
      context: '/',
      files: include,
      ...eslintOptions
    })];
  }
  if(minify) {
    // TODO Switch to Terser
    // https://webpack.js.org/guides/production/#minification
    // Note that it is minified by default in production mode
    result.optimization = {
      minimizer: [new UglifyWebpackPlugin({
        sourceMap: sourceMaps
      })]
    }
  }
  if(hash) {
    // TODO [contenthash] for .js files
    // https://webpack.js.org/guides/caching/#output-filenames
    result.output = {
      chunkFilename: '[name].[chunkhash:8].js',
      filename: '[name].[chunkhash:8].js'
    };
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
  // See https://webpack.js.org/guides/asset-management/#loading-images
  // TODO Use asset/resource instead?
  // Make everything lossless and progressive/interlaced.
  const imageLoaderOptions = {
    mozjpeg: {
      enabled: optimizeJpeg,
      quality: losslessJpeg ? 100 : jpegQuality,
      progressive: progressiveJpeg
    },
    optipng: {
      enabled: optimizePng && interlacePng,
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

exports.loadFiles = loadFiles;

function loadFiles({
  include,
  context = include,
  exclude,
  inlineSizeLimit,
  neverInline = false,
  alwaysInline = false,
  hash = true,
  test,
  additionalLoaders = [],
  outputPath = '[path]'
}) {
  const name = outputPath + (
    hash ?
    '[name].[hash:8].[ext]' :
    '[name].[ext]'
  );
  const loaders = [];
  const fileLoaderOptions = {
    name,
    context
  };
  if(neverInline) {
    loaders.push({
      loader: 'file-loader',
      options: fileLoaderOptions
    });
  } else {
    const urlLoaderOptions = {
      fallback: 'file-loader',
      ...fileLoaderOptions
    };
    if(!alwaysInline) {
      urlLoaderOptions.limit = inlineSizeLimit;
    }
    loaders.push({
      loader: 'url-loader',
      urlLoaderOptions
    });
  }
  loaders.push(...additionalLoaders);
  return {
    module: {
      rules: [
        {
          test,
          include,
          exclude,
          use: loaders
        }
      ]
    }
  };
};

exports.loadPug = function() {
  return {
    module: {
      rules: [
        {
          test: /\.pug$/,
          use: ['pug-loader']
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
  data = {},
  inject = false,
  ...options
}) {
  // See https://webpack.js.org/guides/output-management/#setting-up-htmlwebpackplugin
  // If inject = false, then automatically wrap `data` in a function. The
  // extra parameters are only accessible if `data` is a function. (Yes, it's
  // really this stupid.)
  if(inject === false && typeof data === 'object') {
    const dataObject = data;
    data = function(compilation, assets, assetTags, options) {
      return {
        compilation,
        webpackConfig: compilation.options,
        htmlWebpackPlugin: {
          tags: assetTags,
          files: assets,
          options
        },
        ...dataObject
      };
    };
  }
  return {
    plugins: [new HtmlWebpackPlugin({
      templateParameters: data,
      inject,
      ...options
    })]
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
