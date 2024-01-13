const fs = require('fs');
const path = require('path');
const util = require('util');

const { program } = require('commander');
const webpack = require('webpack');
const WebpackDevServer = require('webpack-dev-server');
const { merge } = require('webpack-merge');

const constructWebpackConfig = require('./config');
const parts = require('./parts');

function handleException(err) {
  console.error(err.stack || err);
  if(err.details) {
    console.error(err.details);
  }
}

async function handleStats(stats, exit, statsFile) {
  const info = stats.toJson();
  console.log(stats.toString({
    colors: true
  }));
  if(stats.hasErrors()) {
    console.error(`See errors above. [${info.errors.length}]`);
  }
  if(stats.hasWarnings()) {
    console.warn(`See warnings above. [${info.warnings.length}]`);
  }
  if(exit && stats.hasErrors()) {
    process.exit(1);
  }
  if(statsFile != null) {
    console.log(`Writing ${statsFile}.`);
    await util.promisify(cb => fs.writeFile(statsFile, JSON.stringify(info), cb))();
  }
  if(!(stats.hasErrors() || stats.hasWarnings())) {
    console.log('Success. No errors or warnings.');
  }
}

async function runWebpack(customConfig, {
  mode,
  baseDir,
  devServer,
  clean,
  cache,
  watch,
  statsFile
}) {
  const webpackConfig = merge([
    constructWebpackConfig({
      baseDir,
      mode,
      usesNginx: !devServer,
      clean,
      useFilesystemCache: cache
    }),
    customConfig
  ]);
  if(devServer) {
    console.log('Running in dev server mode.');
    const devServerOptions = webpackConfig.devServer;
    const compiler = webpack(webpackConfig);
    const server = new WebpackDevServer(devServerOptions, compiler);
    const { host, port } = webpackConfig.devServer;
    server.startCallback(() => {
      console.log(`Started dev server on http://${host}:${port}`);
    });
  } else if(watch) {
    console.log('Running in watch mode.');
    const compiler = webpack(webpackConfig);
    return new Promise((resolve, reject) => {
      // For options, see https://webpack.js.org/configuration/watch/
      compiler.watch({}, (err, stats) => {
        if(err) {
          handleException(err);
        } else {
          handleStats(stats, false, statsFile).then(resolve, reject);
        }
      });
    });
  } else {
    console.log('Running in compile mode.');
    const compiler = webpack(webpackConfig);
    const stats = await util.promisify(cb => compiler.run(cb))();
    await util.promisify(cb => compiler.close(cb))();
    await handleStats(stats, true, statsFile);
  }
}

async function runCli({
  baseDir,
  customConfig,
  modifyProgram = null
}) {
  program
    .option('--production', 'Compile things in production mode.')
    .option('--watch', 'Watch input files and recompile when they change.')
    .option('--dev-server', 'Run the dev server.')
    .option('--no-clean', 'Do not clean the output directory.')
    .option('--cache', 'Use a filesystem build cache.')
    .option('--stats-file <path>',
      'Path where a stats.json file will be written that can be used with analysis tools.');
  if(modifyProgram != null) {
    modifyProgram(program);
  }
  program.parse();
  const programOpts = program.opts();

  const isProduction = programOpts.production;
  const mode = isProduction ? 'production' : 'development';

  const htmlDir = path.join(baseDir, 'src', 'html');
  const jsDir = path.join(baseDir, 'src', 'js');

  function page(name, data = {}) {
    return merge([
      {
        entry: {
          [name]: path.join(jsDir, `${name}.js`)
        }
      },
      parts.page({
        outputName: `${name}.html`,
        template: path.join(htmlDir, `${name}.pug`),
        chunks: [name],
        minifyHtml: isProduction,
        data
      })
    ]);
  }

  function pages(names, data) {
    return merge(names.map(name => page(name, data)));
  }

  const customConfigResult = merge(await customConfig({
    mode,
    isProduction,
    programOpts,
    page,
    pages
  }));
  await runWebpack(customConfigResult, {
    mode,
    baseDir: baseDir,
    devServer: programOpts.devServer,
    clean: programOpts.clean,
    cache: programOpts.cache,
    watch: programOpts.watch,
    statsFile: programOpts.statsFile
  });
}

function main(options) {
  runCli(options).catch(err => {
    handleException(err);
    process.exit(1);
  });
}

exports.main = main;
