'use strict';

const abi = require('ethjs-abi');
const invariant = require('fbjs/lib/invariant');

class Contract {
    constructor(json, address0x, client) {
        invariant(json, 'abi is not defined');
        invariant(client, 'client is not defined');
        invariant(address0x, 'address is not defined');
        invariant(address0x.startsWith('0x'), 'address should starts with 0x');

        this.client = client;
        this.address = address0x;
        this.abi = {};

        for (let item of json.abi) {
            this.abi[item.name] = item;
        }
    }

    async call(method, params = [], from = undefined) {
        const requestParams = [{
            to: this.address,
            data: this.encode(method, params),
            from,
        }, 'latest' ];

        const response = await this.client.call('eth_call', requestParams);
        const encoded = Object.values(abi.decodeMethod(this.abi[method], response));

        return encoded.length === 1 ? encoded[0] : encoded;
    }

    encode(method, params = []) {
        return abi.encodeMethod(this.abi[method], params);
    }
}

module.exports = Contract;