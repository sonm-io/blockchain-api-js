'use strict';

const abi = require('ethjs-abi');
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
        const requestParams = [{
            to: this.address,
            data: this.encode(method, params),
            from,
            gasLimit,
            gasPrice,
        }, 'latest' ];

        const response = await this.gethClient.call('eth_call', requestParams);
        const encoded = Object.values(abi.decodeMethod(this.abi[method], response));

        if (this.abi[method].outputs.length === 1) {
            return encoded[0];
        } else {
            const result = {};

            this.abi[method].outputs.map( (item, index) => {
                result[item.name] = encoded[index];
            });

            return result;
        }

        return encoded.length === 1 ? encoded[0] : encoded;
    }

    encode(method, params = []) {
        return abi.encodeMethod(this.abi[method], params);
    }
}

module.exports = Contract;