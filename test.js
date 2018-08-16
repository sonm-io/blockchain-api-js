'use strict';

const json = require('./contracts/SNMT.json');
const Contract = require('./src/entity/Contract.js');
const EthClient = require('./src/EthClient.js');

const client = new EthClient('https://rinkeby.infura.io');
const c = new Contract(json, '0x06bda3cf79946e8b32a0bb6a3daa174b577c55b5', client);

const main = async() => {
    console.log(await client.getGasPrice());
    //console.log(await c.call('name'));
    //console.log(await c.call('name'));
    //console.log(await c.call('name'));
};

main();