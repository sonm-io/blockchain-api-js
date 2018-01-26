'use strict';

const invariant = require('fbjs/lib/invariant');
const isERC20 = require('../utils/check-token');

class Token {
    constructor({ethClient}) {
        invariant(ethClient, 'gethClient is not defined');

        this.ethClient = ethClient;
        this.data = null;
    }

    async init(address) {
        this.data = await isERC20(address, this.ethClient);
        return this.data;
    }

    async getBalance(address) {
        const result = await this.data.contract.call('balanceOf', [address]);
        return result[0].toString();
    }

    async transfer(to, value) {
        const raw = await this.data.contract.call('transfer', [to, value]);
        return raw.params[0].data;
    }

    getAddress() {
        return this.data.address;
    }

    getInfo() {
        return {
            address: this.data.address,
            symbol: this.data.symbol,
            name: this.data.name,
            decimals: this.data.decimals,
        }
    }
}

module.exports = Token;
