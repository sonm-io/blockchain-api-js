const BN = require('ethereumjs-util').BN;

module.exports = function fromHex(val) {
    if (val.substr(0,2) === '0x') {
        val = val.substr(2);
    }

    return new BN(val, 16).toString(10);
};