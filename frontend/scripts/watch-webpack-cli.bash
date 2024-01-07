npx nodemon \
  --watch webpack.cli.js \
  --watch webpack.config.js \
  --watch webpack.parts.js \
  --watch .browserslistrc \
  --exec node -- webpack.cli.js "$@"
