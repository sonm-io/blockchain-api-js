'use strict';

const invariant = require('fbjs/lib/invariant');
const isERC20 = require('../utils/check-token');

class Token {
    constructor({gethClient}) {
        invariant(gethClient, 'gethClient is not defined');

        this.geth = gethClient;
        this.data = null;
    }

    async init(address) {
        this.data = await isERC20(address, this.geth);
        return this.data;
    }

    async getBalance(address) {
        const result = await this.data.contract.balanceOf(address);
        return result.toString();
    }

    async transferRawTransaction(to, value) {
        const raw = await this.data.contract.transfer.request(to, value);
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