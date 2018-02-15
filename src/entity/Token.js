'use strict';

const invariant = require('fbjs/lib/invariant');
const isERC20 = require('../utils/check-token');

class Token {
    constructor({gethClient}) {
        invariant(gethClient, 'gethClient is not defined');

        this.gethClient = gethClient;
        this.data = null;
    }

    async init(address) {
        this.data = await isERC20(address, this.gethClient);
        return this.data;
    }

    async getBalance(address) {
        const result = await this.data.contract.call('balanceOf', [address]);
        return result.toString();
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

    setData(data) {
        this.data = data;
    }
}

module.exports = Token;
