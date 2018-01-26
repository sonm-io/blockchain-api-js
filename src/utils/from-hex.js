const BN = require('bignumber.js');

module.exports = function fromHex(val) {
    return new BN(val, 16).toString();
};