const path = require('path');

const WebpackBar = require('webpackbar');
const { merge } = require('webpack-merge');

const parts = require('./webpack.parts');

const BASE_DIR = __dirname;
const OUTPUT_DIR = path.join(BASE_DIR, 'dist');
const HTML_DIR = path.join(BASE_DIR, 'src', 'html');
const CSS_DIR = path.join(BASE_DIR, 'src', 'css');
const JS_DIR = path.join(BASE_DIR, 'src', 'js');
const COPY_DIR = path.join(BASE_DIR, 'src', 'copy');
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

// TODO Enable tree shaking in production
// https://webpack.js.org/guides/tree-shaking/#conclusion

// TODO testing with Mocha
// https://webpack.js.org/guides/integrations/#mocha

function page(name, { minifyHtml, data } = {}) {
  return merge([
    {
      entry: {
        [name]: path.join(JS_DIR, `${name}.js`)
      }
    },
    parts.page({
      outputName: `${name}.html`,
      template: path.join(HTML_DIR, `${name}.pug`),
      chunks: [name],
      minifyHtml,
      data
    })
  ]);
}

function pages(names, options) {
  return merge(names.map(name => page(name, options)));
}

module.exports = async function(mode, {
  usesNginx = true,
  clean = false
}) {
  const isProduction = mode === 'production';
  return merge([
    // Targets
    pages([
      'index',
      'blog/index',
      'blog/first-post',
      'about',
      'subdir/relative-url-in-sass',
      'babel-test',
      'images-test'
    ], {
      data: {
        useGoogleAnalytics: isProduction
      },
      minifyHtml: isProduction
    }),
    parts.general({
      mode,
      outputDir: OUTPUT_DIR,
      clean
    }),
    // HTML config
    parts.loadPug(),
    // CSS config
    parts.loadSass({
      include: CSS_DIR,
      autoprefixer: true,
      sourceMaps: !isProduction,
      minify: isProduction,
      hash: usesNginx
    }),
    // JS config
    parts.loadJavaScript({
      include: JS_DIR,
      exclude: NODE_MODULES_DIR,
      cacheBabel: !isProduction,
      sourceMaps: !isProduction,
      sourceMapsNoEval: usesNginx,
      minify: isProduction,
      hash: usesNginx,
      polyfill: true,
      cacheEslint: !isProduction,
      eslintOptions: {
        failOnError: isProduction
      }
    }),
    // Assets config
    parts.loadImages({
      include: IMAGES_DIR,
      loadJpeg: true,
      loadPng: true,
      loadGif: true,
      loadSvg: true,
      outputDir: 'images',
      neverInline: true,
      hash: usesNginx,
      optimize: isProduction,
      // Let zopflipng take care of optimizing pngs.
      optimizePng: false
    }),
    parts.loadFonts({
      include: FONTS_DIR,
      neverInline: true,
      hash: usesNginx,
      outputDir: 'fonts'
    }),
    parts.copy([
      { from: COPY_DIR, to: '' }
    ]),
    // Configure the dev server
    parts.devServer({
      port: process.env.PORT
    }),
    // Progress messages
    {
      plugins: [
        new WebpackBar()
      ]
    }
  ]);
};
