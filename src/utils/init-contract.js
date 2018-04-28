'use strict';

const invariant = require('fbjs/lib/invariant');
const Contract = require('../entity/Contract.js');

const contracts = {
    token: require('../../contracts/SNMT.json'),
    gate: require('../../contracts/GATE.json'),
    oracleUSD: require('../../contracts/OracleUSD.json'),
};

module.exports = function (name, gethClient, address) {
    invariant(gethClient, 'gethClient is not defined');
    invariant(name, 'set current contract name');
    invariant(address, 'address is not defined');
    invariant(address.startsWith('0x'), 'address should starts with 0x');

    return new Contract(contracts[name], address, gethClient);
};