const path = require('path');

const WebpackBar = require('webpackbar');
const { merge } = require('webpack-merge');

const parts = require('./parts');

function constructWebpackConfig({
  baseDir,
  mode,
  usesNginx,
  clean,
  useFilesystemCache
}) {

  const outputDir = path.join(baseDir, 'dist');
  const cssDir = path.join(baseDir, 'src', 'css');
  const jsDir = path.join(baseDir, 'src', 'js');
  const copyDir = path.join(baseDir, 'src', 'copy');
  const assetsDir = path.join(baseDir, 'assets');
  const imagesDir = path.join(assetsDir, 'images');
  const fontsDir = path.join(assetsDir, 'fonts');
  const nodeModulesDir = path.join(baseDir, 'node_modules');

  const isProduction = mode === 'production';

  return merge([
    parts.general({
      mode,
      outputDir: outputDir,
      clean,
      splitVendor: true,
      useFilesystemCache
    }),
    // HTML config
    parts.loadPug(),
    // CSS config
    parts.loadSass({
      include: [cssDir, nodeModulesDir],
      autoprefixer: true,
      sourceMaps: !isProduction,
      minify: isProduction,
      hash: usesNginx
    }),
    // JS config
    parts.loadJavaScript({
      include: jsDir,
      exclude: nodeModulesDir,
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
      include: imagesDir,
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
      include: fontsDir,
      neverInline: true,
      hash: usesNginx,
      outputDir: 'fonts'
    }),
    parts.copy([
      { from: copyDir, to: '' }
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

module.exports = constructWebpackConfig;
