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
        if (!this.data.contract) {
            await this.init(this.data.address);
        }

        const result = await this.data.contract.balanceOf(address);
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