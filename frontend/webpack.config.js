const path = require('path');

const WebpackBar = require('webpackbar');
const merge = require('webpack-merge');

const parts = require('./webpack.parts');

const BASE_DIR = __dirname;
const OUTPUT_DIR = path.join(BASE_DIR, 'dist');
const HTML_DIR = path.join(BASE_DIR, 'src', 'html');
const JS_DIR = path.join(BASE_DIR, 'src', 'js');
const ASSETS_DIR = path.join(BASE_DIR, 'assets');
const IMAGES_DIR = path.join(BASE_DIR, 'assets', 'images');
const FONTS_DIR = path.join(BASE_DIR, 'assets', 'fonts');
const NODE_MODULES_DIR = path.join(BASE_DIR, 'node_modules');

// TODO Polyfill Promise?
// https://github.com/stefanpenner/es6-promise
// https://github.com/taylorhakes/promise-polyfill

// TODO Bundle analysis?
// https://webpack.js.org/guides/code-splitting/#bundle-analysis

// TODO Add build caching?
// https://webpack.js.org/guides/build-performance/#persistent-cache
// https://webpack.js.org/configuration/cache/

// TODO No hashing in development mode
// https://webpack.js.org/guides/build-performance/#avoid-production-specific-tooling

// TODO Enable tree shaking in production
// https://webpack.js.org/guides/tree-shaking/#conclusion

// TODO testing with Mocha
// https://webpack.js.org/guides/integrations/#mocha

// TODO polyfill core-js?

function page(name, { minify, data } = {}) {
  return merge([
    {
      entry: {
        [name]: path.join(JS_DIR, `${name}.js`)
      }
    },
    parts.page({
      filename: `${name}.html`,
      template: path.join(HTML_DIR, `${name}.pug`),
      chunks: [name],
      minify,
      data
    })
  ]);
}

function pages(names, options) {
  return merge(names.map(name => page(name, options)));
}

module.exports = async function(mode, {
  inlineSourceMaps,
  clean
}) {

  const isProduction = mode === 'production';

  const minifyHTMLOptions = {
    collapseWhitespace: true,
    // This is important
    conservativeCollapse: true,
    removeComments: true,
    removeRedundantAttributes: true,
    removeScriptTypeAttributes: true,
    removeStyleLinkTypeAttributes: true
  };

  let result = merge([
    // Targets
    pages([
      'index'
    ], {
      data: {
        useGoogleAnalytics: isProduction
      },
      minify: isProduction ? minifyHTMLOptions : false
    }),
    // Configure output
    {
      mode,
      output: {
        path: OUTPUT_DIR,
        // See https://webpack.js.org/guides/public-path/
        publicPath: '/'
        // TODO No pathinfo for faster build
        // https://webpack.js.org/guides/build-performance/#output-without-path-info
      },
      optimization: {
        // TODO Use 'deterministic'
        // https://webpack.js.org/guides/caching/#module-identifiers
        // TODO Disable some things in dev mode?
        // https://webpack.js.org/guides/build-performance/#avoid-extra-optimization-steps
        splitChunks: {
          // Generates a separate .js file for third-party libraries.
          // See https://webpack.js.org/guides/code-splitting/#splitchunksplugin
          // See https://webpack.js.org/plugins/split-chunks-plugin/
          // and https://survivejs.com/webpack/building/bundle-splitting/
          // TODO Use cacheGroups
          // https://webpack.js.org/guides/caching/#extracting-boilerplate
          chunks: 'all'
        },
        // See https://survivejs.com/webpack/optimizing/separating-manifest/
        // TODO Change to 'single'?
        // https://webpack.js.org/guides/caching/#extracting-boilerplate
        // TODO Change to true?
        // https://webpack.js.org/guides/build-performance/#minimal-entry-chunk
        runtimeChunk: {
          name: 'manifest'
        }
      }
    },
    // HTML config
    parts.loadPug(),
    // CSS config
    parts.loadSass({
      include: CSS_DIR,
      separateFile: isProduction,
      autoprefixer: isProduction,
      sourceMaps: !isProduction,
      minify: isProduction,
      hash: isProduction
    }),
    // JS config
    parts.loadJavaScript({
      include: JS_DIR,
      exclude: NODE_MODULES_DIR,
      sourceMaps: !isProduction,
      minify: isProduction,
      hash: true,
      polyfill: true,
      eslintOptions: {
        failOnError: isProduction
      }
    }),
    // Assets config
    parts.loadImages({
      include: IMAGES_DIR,
      neverInline: true,
      optimize: isProduction,
      // Let zopflipng take care of optimizing pngs.
      optimizePng: false,
      hash: true,
      outputPath: 'images/[path]'
    }),
    parts.loadFonts({
      include: FONTS_DIR,
      neverInline: true,
      hash: true,
      outputPath: 'fonts/'
    }),
    parts.loadFiles({
      include: ASSETS_DIR,
      test: /\.pdf$/,
      neverInline: true,
      hash: true
    }),
    // Configure the dev server
    parts.devServer({
      port: process.env.PORT,
      historyApiFallback: {
        rewrites: [
          { from: /^.*\/$/, to: c => `/${c.match[0]}index.html` },
          { from: /^.*$/, to: c => `/${c.match[0]}.html` }
        ]
      }
    }),
    // Progress messages
    // TODO Remove this for faster builds?
    // https://webpack.js.org/guides/build-performance/#progress-plugin
    {
      plugins: [
        new WebpackBar()
      ]
    },
  ]);
  // Clean output directory before generating new files
  if(clean) {
    result = merge([result, parts.clean()]);
  }
  if(isProduction) {
    result = merge([
      result,
      {
        optimization: {
          splitChunks: {
            name: false
          }
        }
      }
    ]);
  } else {
    result = merge([
      result,
      parts.generateSourceMaps({
        // TODO Use eval-cheap-module-source-map
        // https://webpack.js.org/guides/build-performance/#devtool
        // https://webpack.js.org/guides/production/#source-mapping
        type: inlineSourceMaps ? 'inline-source-map' : 'eval-source-map'
      })
    ]);
  }
  return result;
};
