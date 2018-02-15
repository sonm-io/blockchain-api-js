'use strict';

const abi = require('ethereumjs-abi');
const invariant = require('fbjs/lib/invariant');

class Contract {
    constructor(json, address0x, gethClient) {
        invariant(json, 'abi is not defined');
        invariant(gethClient, 'gethClient is not defined');
        invariant(address0x, 'address is not defined');
        invariant(address0x.startsWith('0x'), 'address should starts with 0x');

        this.gethClient = gethClient;
        this.address = address0x;
        this.abi = {};

        for (let item of json.abi) {
            this.abi[item.name] = item;
        }
    }

    async call(method, params = [], from = undefined, gasLimit = undefined, gasPrice = undefined) {
        const methodSign = `${this.abi[method].name}(${this.abi[method].inputs.map(item => item.type).join(",")}):(${this.abi[method].outputs.map(item => item.type).join(",")})`;

        console.log(method, methodSign);

        const requestParams = [{
            to: this.address,
            data: '0x' + abi.simpleEncode(methodSign, params.length > 1 ? params : params[0]).toString('hex'),
            from,
            gasLimit,
            gasPrice,
        }, 'latest' ];

        const response = await this.gethClient.call('eth_call', requestParams);


        console.log(response);

        const encoded = Object.values(abi.simpleDecode(methodSign, response));

        return encoded.length === 1 ? encoded[0] : encoded;
    }
}

module.exports = Contract;