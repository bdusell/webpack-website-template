npx nodemon \
  --watch webpack.cli.js \
  --watch webpack.config.js \
  --watch webpack.parts.js \
  --exec node webpack.cli.js --dev-server "$@"
