'use strict';

const invariant = require('fbjs/lib/invariant');
const Token = require('./Token');

class TokenList {
    constructor({gethClient, sonmTokenAddress}) {
        invariant(gethClient, 'gethClient is not defined');
        invariant(sonmTokenAddress, 'sonmTokenAddress is not defined');

        this.geth = gethClient;

        this.list = [{
            address: '0x',
            symbol: 'Ether',
            name: 'Ethereum',
            decimals: '18',
        }];

        this.tokens = {};
        this.contracts = {};
    }

    getList() {
        return this.list;
    }

    getToken(address) {
        return this.tokens[address];
    }

    async add(address) {
        if(address !== '0x') {
            if (this.tokens[address]) {
                return this.tokens[address];
            } else {
                try {
                    const token = new Token({gethClient: this.geth});
                    const tokenInfo = await token.init(address);

                    this.tokens[tokenInfo.address] = token;

                    const info = token.getInfo();

                    this.list.push(info);

                    return info;
                } catch (err) {
                    throw err;
                }

                const token = new Token({gethClient: this.geth});
                const tokenInfo = await token.init(address);

                if (tokenInfo) {
                    this.tokens[tokenInfo.address] = token;

                    const info = token.getInfo();

                    this.list.push(info);

                    return info;
                } else {
                    return false;
                }
            }
        } else {
            throw new Error('address_not_valid');
        }
    }

    async getTokenInfo(address) {
        try {
            const token = new Token({gethClient: this.geth});
            const tokenInfo = await token.init(address);

            return token.getInfo();
        } catch (err) {
            throw err;
        }
    }

    async getBalances(address) {
        const balances = {};

        try {
            let requests = [
                this.geth.method('getBalance')(address)
            ];

            for (const tokenAddress in this.tokens) {
                requests.push(this.tokens[tokenAddress].getBalance(address));
            }

            const results = await Promise.all(requests);
            const addresses = Object.keys(this.tokens);

            for (const index in results) {
                balances[parseInt(index) === 0 ? '0x' : addresses[index-1]] = results[index].toString()
            }
        } catch(err) {
            console.log(err.stack);
        }

        return balances;
    }
}

module.exports = TokenList;