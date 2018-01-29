'use strict';

const invariant = require('fbjs/lib/invariant');
const Token = require('./Token');

class TokenList {
    constructor({gethClient, sonmTokenAddress}) {
        invariant(gethClient, 'gethClient is not defined');
        invariant(sonmTokenAddress, 'sonmTokenAddress is not defined');

        this.gethClient = gethClient;

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
                const token = new Token({gethClient: this.gethClient});
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
            return false;
        }
    }

    async getTokenInfo(address) {
        const token = new Token({gethClient: this.gethClient});
        const tokenInfo = await token.init(address);

        if (tokenInfo) {
            return token.getInfo();
        } else {
            return false;
        }
    }

    async getBalances(address) {
        const balances = {};

        try {
            let requests = [
                this.gethClient.getBalance(address)
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