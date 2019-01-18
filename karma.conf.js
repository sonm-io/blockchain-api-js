module.exports = function (config) {
    config.set({
        browserNoActivityTimeout: 120000,

        frameworks: ['browserify', 'mocha'],

        preprocessors: {
            'test/**/*.js': ['browserify'],
            'src/**/*.js': ['browserify'],
        },

        browsers: ['Chrome'], // You may use 'ChromeCanary', 'Chromium' or any other supported browser

        singleRun: false,

        files: [
            "src/**/*.js",
            "test/*.test.js"
        ],
    });
};