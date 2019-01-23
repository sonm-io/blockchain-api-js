import babel from "rollup-plugin-babel";
//import { uglify } from "rollup-plugin-uglify";

const isRelease = process.env.NODE_ENV === "production";

export default {
  input: "./src/index.js",
  external: [
    "ethjs-provider-signer",
    "ethjs-signer",
    "lodash/fp/get",
    "fbjs/lib/invariant",
    "truffle-contract",
    "web3",
    "scrypt-async",
    "js-sha3",
    "browserify-aes",
    "bignumber.js",
    "buffer" // TODO remove
  ],
  output: {
    file: isRelease ? "./dist/index.min.js" : "./dist/index.js",
    format: "cjs"
  },
  plugins: [
    babel({
      exclude: "node_modules/**",
      comments: false,
      externalHelpers: true,
    //   presets: [
    //     [
    //       "@babel/preset-env",
    //       {
    //         modules: false
    //       }
    //     ]
    //   ]
    }),
    //isRelease && uglify()
  ]
};
