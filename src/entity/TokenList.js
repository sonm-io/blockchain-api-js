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
    }

    getList() {
        return this.list;
    }

    async add(address) {
        const token = new Token({gethClient: this.geth});
        const tokenInfo = await token.init(address);

        if (tokenInfo) {
            const data = {
                address: tokenInfo.address,
                symbol: tokenInfo.symbol,
                name: tokenInfo.name,
                decimals: tokenInfo.decimals,
            };

            this.list.push(data);
            this.tokens[tokenInfo.address] = token;

            return data;
        } else {
            return false;
        }
    }

    async getBalances(address) {
        const balances = {};

        try {
            let requests = [
                this.geth.method('getBalance')(address)
            ];

            for (const tokenAddress in this.tokens) {
                requests.push(this.tokens[tokenAddress].getBalance(address))
            }

            const results = await Promise.all(requests);

            for (let index in results) {
                balances[this.list[index].address] = results[index].toString()
            }
        } catch(err) {
            console.log(err.stack);
        }

        return balances;
    }
}

module.exports = TokenList;