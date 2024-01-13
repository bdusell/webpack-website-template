const { main } = require('./webpack-config/cli');

main({
  baseDir: __dirname,
  customConfig: async ({ pages, isProduction }) => {
    return [
      pages([
        'index',
        'blog/index',
        'blog/first-post',
        'about',
        'subdir/relative-url-in-sass',
        'babel-test',
        'images-test'
      ], {
        useGoogleAnalytics: isProduction
      })
    ];
  }
});
