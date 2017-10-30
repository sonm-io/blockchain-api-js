module.exports = function(config) {
  config.set({
    browserNoActivityTimeout: 60000,

    frameworks: [ 'browserify', 'mocha' ],
    preprocessors: {
      'test/**/*.js': [ 'browserify' ],
      'src/**/*.js': [ 'browserify' ],
    },

    browserify: {
      debug: true,
    },

    browsers: ['Chrome'], // You may use 'ChromeCanary', 'Chromium' or any other supported browser
    singleRun: true,
    files: [
      "src/**/*.js",
      "test/*.test.js"
    ],
  })
};