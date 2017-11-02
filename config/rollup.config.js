const path = require('path');
const commonJsPlugin = require('rollup-plugin-commonjs');
const jsonPlugin = require('rollup-plugin-json');
// const nodeBuiiltinsPlugin = require('rollup-plugin-node-builtins');
const babelPlugin = require('rollup-plugin-babel');

const isRelease = process.env.NODE_ENV === 'production';

module.exports = {
  name: 'sonm-blockchain-api',
  input: path.join(__dirname, '..', 'index.js'),
  external: [
    'ethjs-provider-signer',
    'ethjs-signer',
    'lodash/fp/get',
    'fbjs/lib/invariant',
    'truffle-contract',
    'web3',
    'scrypt-async',
    'js-sha3',
    'browserify-aes',
    'bignumber.js',
    'buffer', // TODO remove
  ],
  globals: [],
  output: {
    file: path.join(__dirname, '..', isRelease ? 'dist/index.min.js' : 'dist/index.js'),
    format: 'cjs',
  },
  plugins: [
    commonJsPlugin(),
    jsonPlugin(),
    babelPlugin({
      exclude: 'node_modules/**',
      comments: false,
      externalHelpers: true,
    }),
  ],
};