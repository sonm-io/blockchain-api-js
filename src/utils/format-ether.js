const Web3 = require('web3');
const web3 = new Web3();

module.exports = {
    fromWei: web3.fromWei,
    toWei: web3.toWei,
};
