const util = require('util');

const { program } = require('commander');
const webpack = require('webpack');
const WebpackDevServer = require('webpack-dev-server');

const constructWebpackConfig = require('./webpack.config.js');

program
  .option('--production', 'Compile things in production mode.')
  .option('--watch', 'Watch input files and recompile when they change.')
  .option('--dev-server', 'Run the dev server.')
  .option('--inline', 'Use inline source maps.')
  .option('--no-clean', 'Do not clean the output directory.');
program.parse();
const args = program.opts();

const isProduction = args.production;
const mode = isProduction ? 'production' : 'development';

function handleException(err) {
  console.error(err.stack || err);
  if(err.details) {
    console.error(err.details);
  }
}

function handleStats(stats, exit) {
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
  if(!(stats.hasErrors() || stats.hasWarnings())) {
    console.log('Success. No errors or warnings.');
  }
}

async function main() {
  const webpackConfig = await constructWebpackConfig(mode, {
    usesNginx: !args.devServer,
    inlineSourceMaps: args.inline,
    clean: args.clean
  });
  // TODO are these needed for devServer?
  const watchOptions = {
    aggregateTimeout: 300,
    poll: false
  };
  if(args.devServer) {
    console.log('Running in dev server mode.');
    const devServerOptions = webpackConfig.devServer;
    const compiler = webpack(webpackConfig);
    const server = new WebpackDevServer(devServerOptions, compiler);
    const { host, port } = webpackConfig.devServer;
    server.startCallback(() => {
      console.log(`Started dev server on http://${host}:${port}`);
    });
  } else if(args.watch) {
    console.log('Running in watch mode.');
    const compiler = webpack(webpackConfig);
    return new Promise((resolve, reject) => {
      compiler.watch(watchOptions, (err, stats) => {
        if(err) {
          handleException(err);
        } else {
          handleStats(stats, false);
        }
      });
    });
  } else {
    console.log('Running in compile mode.');
    const compiler = webpack(webpackConfig);
    const stats = await util.promisify(cb => compiler.run(cb))();
    handleStats(stats, true);
  }
}

main().catch(err => {
  handleException(err);
  process.exit(1);
});
