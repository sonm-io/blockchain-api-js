const BN = require('ethereumjs-util').BN;

module.exports = function fromHex(val) {
    return new BN(val, 16).toString();
};