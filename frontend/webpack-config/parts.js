const autoprefixer = require('autoprefixer');
const CopyPlugin = require("copy-webpack-plugin");
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");
const ESLintPlugin = require('eslint-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const ImageMinimizerPlugin = require('image-minimizer-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');
const webpack = require('webpack');
const { merge } = require('webpack-merge');

const HASH_LENGTH = 8;

function warnIfIncludeIsMissing(include, name) {
  // Print a warning whenever `include` is missing for a loader.
  // See https://webpack.js.org/guides/build-performance/#loaders
  if(include == null) {
    console.warn(`\`include\` was not used with \`${name}\`, which may result in a slower build`);
  }
}

exports.general = function({
  mode,
  outputDir,
  clean,
  publicPath = '/',
  splitVendor = true,
  // NOTE If used, the filesystem cache is located at
  // `node_modules/.cache/webpack`.
  useFilesystemCache = false
}) {
  let splitVendorOptions;
  if(splitVendor) {
    // Generates a separate .js file for libraries from node_modules/.
    // See https://webpack.js.org/guides/caching/#extracting-boilerplate
    // See https://survivejs.com/webpack/building/bundle-splitting/
    // Apparently this is the default behavior anyway; it's not clear whether
    // adding this configuration is necessary.
    // See https://webpack.js.org/plugins/split-chunks-plugin/
    splitVendorOptions = {
      cacheGroups: {
        vendor: {
           test: /[\\/]node_modules[\\/]/,
           name: 'vendors',
           chunks: 'all',
        }
      }
    };
  } else {
    splitVendorOptions = {};
  }
  // Optionally cache builds in the filesystem.
  // See https://webpack.js.org/guides/build-performance/#persistent-cache
  // See https://webpack.js.org/configuration/cache/
  const cacheOptions =
    useFilesystemCache ?
    {
      cache: {
        type: 'filesystem'
      }
    } :
    {};
  return {
    mode,
    output: {
      path: outputDir,
      // See https://webpack.js.org/guides/public-path/
      publicPath,
      // See https://webpack.js.org/guides/output-management/#cleaning-up-the-dist-folder
      clean
    },
    optimization: {
      splitChunks: {
        // See https://webpack.js.org/guides/code-splitting/#splitchunksplugin
        // See https://webpack.js.org/plugins/split-chunks-plugin/
        chunks: 'all',
        ...splitVendorOptions
      },
      // Factor out the Webpack module runtime into a single chunk.
      // See https://webpack.js.org/configuration/optimization/#optimizationruntimechunk
      // See https://survivejs.com/webpack/optimizing/separating-runtime/
      // See https://webpack.js.org/guides/caching/#extracting-boilerplate
      // See https://webpack.js.org/guides/build-performance/#minimal-entry-chunk
      runtimeChunk: 'single'
    },
    ...cacheOptions
  };
};

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
  test,
  include,
  exclude,
  separateFile = true,
  autoprefixer = true,
  sourceMaps = true,
  minify = false,
  hash = false,
  additionalLoaders
}) {
  warnIfIncludeIsMissing(include, 'loadCSS');
  // See https://webpack.js.org/guides/asset-management/#loading-css
  // See https://webpack.js.org/plugins/mini-css-extract-plugin/
  // If autoprefixer is needed, add it to the list of postcss plugins.
  const postcssPlugins = [];
  if(autoprefixer) {
    postcssPlugins.push(_autoprefixer());
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
    plugins.push(
      new MiniCssExtractPlugin({
        filename: hash ? `[name].[contenthash:${HASH_LENGTH}].css` : '[name].css',
        chunkFilename: hash ? `[id].[contenthash:${HASH_LENGTH}].css` : '[id].css'
      })
    );
  }
  const sourceMapOptions = {};
  if(sourceMaps) {
    // It is necessary to use the source map plugin instead of `devtool`
    // because we need to use different source map types for JS and CSS.
    // and https://github.com/webpack/webpack/blob/228fc69f40c3e9ec6d99a5105fdc85b5bca4ce43/lib/EvalSourceMapDevToolPlugin.js
    // and https://github.com/webpack/webpack/blob/228fc69f40c3e9ec6d99a5105fdc85b5bca4ce43/lib/SourceMapDevToolPlugin.js
    // and https://github.com/webpack/webpack/blob/228fc69f40c3e9ec6d99a5105fdc85b5bca4ce43/lib/WebpackOptionsApply.js#L241-L270
    sourceMapOptions.devtool = false;
    plugins.push(
      new webpack.SourceMapDevToolPlugin({
        test: /\.css($|\?)/i,
        filename: null,
        module: true,
        columns: true,
        noSources: false
      })
    );
  }
  const minifyOptions = {};
  if(minify) {
    // https://webpack.js.org/plugins/mini-css-extract-plugin/#minimizing-for-production
    minifyOptions.optimization = {
      minimize: true,
      minimizer: [
        new CssMinimizerPlugin({
          minimizerOptions: {
            preset: ['default']
          }
        })
      ]
    };
  }
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
    },
    plugins,
    ...sourceMapOptions,
    ...minifyOptions
  };
}

// NOTE Babel automatically reads the file `.browserslistrc`.
// NOTE For even more aggressive tree shaking (elimination of unused modules),
// consider using "sideEffects" in package.json. Make sure to mark stylesheets
// as having side effects.
// See https://webpack.js.org/guides/tree-shaking/
exports.loadJavaScript = function({
  include,
  exclude,
  // If used, the Babel cache is stored in `node_modules/.cache/babel-loader`.
  cacheBabel = false,
  sourceMaps = false,
  sourceMapsNoEval = false,
  minify = false,
  separateCommentsFile = true,
  hash = false,
  polyfill = false,
  lint = true,
  // If used, the ESLint cache is stored in
  // `node_modules/.cache/eslint-webpack-plugin`.
  cacheEslint = false,
  eslintOptions = {}
}) {
  warnIfIncludeIsMissing(include, 'loadJavaScript');
  if(exclude == null) {
    console.warn('`exclude` was not used with `loadJavaScript`; it is recommended to exclude `node_modules`');
  }
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
                // NOTE By default, Babel targets the oldest browsers possible,
                // which likely generates more code than necessary. This can be
                // adjusted with the file `.browserslistrc`.
                // NOTE Babel is smart enough to know that it's running in
                // Webpack, so it preserves import/export syntax so that it is
                // compatible with tree shaking.
                // See https://babeljs.io/docs/babel-preset-env#modules
                // See https://webpack.js.org/guides/tree-shaking/#conclusion
                presets: ['@babel/preset-env'],
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
      filename: hash ? `[name].[contenthash:${HASH_LENGTH}].js` : '[name].js',
      chunkFilename: hash ? `[id].[contenthash:${HASH_LENGTH}].js` : '[id].js'
    },
    plugins: []
  };
  if(sourceMaps) {
    // It is necessary to use the source map plugin instead of `devtool`
    // because we need to use different source map types for JS and CSS.
    // See https://github.com/webpack/webpack/blob/228fc69f40c3e9ec6d99a5105fdc85b5bca4ce43/declarations/plugins/SourceMapDevToolPlugin.d.ts
    // and https://github.com/webpack/webpack/blob/228fc69f40c3e9ec6d99a5105fdc85b5bca4ce43/lib/EvalSourceMapDevToolPlugin.js
    // and https://github.com/webpack/webpack/blob/228fc69f40c3e9ec6d99a5105fdc85b5bca4ce43/lib/WebpackOptionsApply.js#L241-L270
    result.devtool = false;
    const sourceMapPluginOptions = {
      test: /\.((c|m)?js)($|\?)/i,
      module: true,
      columns: true,
      noSources: false
    };
    result.plugins.push(
      sourceMapsNoEval ?
        new webpack.SourceMapDevToolPlugin(sourceMapPluginOptions) :
        new webpack.EvalSourceMapDevToolPlugin(sourceMapPluginOptions)
    );
  }
  if(lint) {
    result.plugins.push(
      new ESLintPlugin({
        cache: cacheEslint,
        context: '/',
        files: include,
        ...eslintOptions
      })
    );
  }
  if(minify) {
    // See https://webpack.js.org/guides/production/#minification
    let extractComments;
    if(separateCommentsFile) {
      extractComments = {
        condition: true,
        banner: commentsFile => `For license information, see the file ${commentsFile}`
      };
    } else {
      extractComments = false;
    }
    result.optimization = {
      minimize: true,
      minimizer: [
        new TerserPlugin({
          extractComments
        })
      ]
    };
  }
  return result;
};

exports.loadImages = function({
  loadJpeg = false,
  loadPng = false,
  loadGif = false,
  loadSvg = false,
  optimize = true,
  optimizeJpeg = null,
  optimizePng = null,
  optimizeGif = null,
  optimizeSvg = null,
  lossless = true,
  losslessJpeg = null,
  losslessPng = null,
  progressiveJpeg = true,
  progressivePng = false,
  progressiveGif = false,
  jpegOptions = {},
  pngOptions = {},
  gifOptions = {},
  svgOptions = {},
  ...options
}) {
  if(optimizeJpeg == null) optimizeJpeg = optimize;
  if(optimizePng == null) optimizePng = optimize;
  if(optimizeGif == null) optimizeGif = optimize;
  if(optimizeSvg == null) optimizeSvg = optimize;
  if(losslessJpeg == null) losslessJpeg = lossless;
  if(losslessPng == null) losslessPng = lossless;

  const unoptimizedFormats = [];
  const sharpFormats = [];
  const svgoFormats = [];
  if(loadJpeg) {
    (optimizeJpeg ? sharpFormats : unoptimizedFormats).push('jpg');
  }
  if(loadPng) {
    (optimizePng ? sharpFormats : unoptimizedFormats).push('png');
  }
  if(loadGif) {
    (optimizeGif ? sharpFormats : unoptimizedFormats).push('gif');
  }
  if(loadSvg) {
    (optimizeSvg ? svgoFormats : unoptimizedFormats).push('svg');
  }

  const configs = [];
  if(unoptimizedFormats.length > 0) {
    configs.push(loadFiles({
      ...options,
      test: getImageTester(unoptimizedFormats)
    }));
  }
  if(sharpFormats.length > 0) {
    // See https://github.com/webpack-contrib/image-minimizer-webpack-plugin?tab=readme-ov-file#optimize-with-sharp
    const encodeOptions = {};
    if(loadJpeg && optimizeJpeg) {
      jpegOptions = { ...jpegOptions };
      if(losslessJpeg) jpegOptions.quality = 100;
      jpegOptions.progressive = progressiveJpeg;
      encodeOptions.jpeg = jpegOptions;
    }
    if(loadPng && optimizePng) {
      pngOptions = { ...pngOptions };
      if(losslessPng) pngOptions.quality = 100;
      pngOptions.progressive = progressivePng;
      encodeOptions.png = pngOptions;
    }
    if(loadGif && optimizeGif) {
      gifOptions = { ...gifOptions };
      gifOptions.progressive = progressiveGif;
      encodeOptions.gif = gifOptions;
    }
    configs.push(loadFiles({
      ...options,
      test: getImageTester(sharpFormats),
      additionalLoaders: [
        {
          loader: ImageMinimizerPlugin.loader,
          options: {
            minimizer: {
              implementation: ImageMinimizerPlugin.sharpMinify,
              options: {
                encodeOptions
              }
            }
          }
        }
      ]
    }));
  }
  if(svgoFormats.length > 0) {
    // See https://github.com/webpack-contrib/image-minimizer-webpack-plugin?tab=readme-ov-file#optimize-with-svgo
    configs.push(loadFiles({
      ...options,
      test: getImageTester(svgoFormats),
      additionalLoaders: [
        {
          loader: ImageMinimizerPlugin.loader,
          options: {
            minimizer: {
              implementation: ImageMinimizerPlugin.svgoMinify,
              options: {
                encodeOptions: {
                  multipass: true,
                  plugins: ['preset-default'],
                  ...svgOptions
                }
              }
            }
          }
        }
      ]
    }));
  }
  return merge(configs);
};

function getImageTester(formats) {
  return new RegExp(`\.(?:${formats.map(getFormatRegexp).join('|')})$`);
}

function getFormatRegexp(format) {
  return format === 'jpg' ? 'jpe?g' : format;
}

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
  context = include,
  exclude,
  outputDir = '.',
  inlineSizeLimit,
  neverInline = false,
  alwaysInline = false,
  hash = true,
  additionalLoaders = []
}) {
  warnIfIncludeIsMissing(include, 'loadFiles');
  if(neverInline && alwaysInline) {
    throw new Error('neverInline and alwaysInline cannot both be true');
  }
  let assetOptions;
  if(alwaysInline) {
    assetOptions = { type: 'asset/inline' };
  } else {
    const outputOptions = {
      generator: {
        // Webpack 5 does not support a `context` option that strips parent
        // directories from the filename. So, we have to reimplement that
        // behavior ourselves.
        // See https://stackoverflow.com/questions/69138588/webpack-5-path-context
        filename: options => {
          const originalPath = options.module.resource;
          const pathInfo = path.posix.parse(originalPath);
          const originalDir = pathInfo.dir;
          if(!originalDir.startsWith(context)) {
            throw new Error(`path ${originalDir} does not start with context ${context}`);
          }
          const fileOutputDir = originalDir.slice(context.length);
          let hashPart;
          if(hash) {
            const fullHash = options.contentHash;
            const partialHash = fullHash.slice(0, HASH_LENGTH);
            hashPart = `.${partialHash}`;
          } else {
            hashPart = '';
          }
          return `${outputDir}${fileOutputDir}/${pathInfo.name}${hashPart}${pathInfo.ext}`;
        }
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

exports.copy = function(patterns) {
  return {
    plugins: [
      new CopyPlugin({ patterns })
    ]
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
        chunks,
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
