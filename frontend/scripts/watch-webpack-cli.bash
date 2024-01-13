npx nodemon \
  --watch webpack.cli.js \
  --watch package.json \
  --watch .browserslistrc \
  --watch .eslintrc.yml \
  --exec node -- webpack.cli.js "$@"
