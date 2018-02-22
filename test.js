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

e331b6d69882b4cb4ea581d88e0b604039a3de5967688d3dcffdd2270c0fd109
0x69deaef1da6fd4d01489d7b46e8e3aab587d9fcd49de2080d367c3ef120689ef