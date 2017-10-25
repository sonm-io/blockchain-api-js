'use strict';

const getPrivateKey = require('../src/utils/read-private-key-json');
const testWallet = require('./data/Vasya_11111111.json');

console.log(getPrivateKey(testWallet, '11111111'));