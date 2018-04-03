'use strict';

const invariant = require('fbjs/lib/invariant');
const initContract = require('../utils/init-contract');
const Token = require('./Token');
const add0x = require('../utils/add-0x');
const BN = require('ethereumjs-util').BN;

class TokenList {
    constructor({gethClient}) {
        invariant(gethClient, 'gethClient is not defined');

        this.gethClient = gethClient;
        this.tokens = {};

        this.list = [{
            address: '0x',
            symbol: 'Ether',
            name: 'Ethereum',
            decimals: '18',
        }];
    }

    async initSonmToken(sonmTokenAddress) {
        invariant(sonmTokenAddress, 'sonmTokenAddress is not defined');
        invariant(sonmTokenAddress.startsWith('0x'), 'sonmTokenAddress should starts with 0x');

        const info = {
            address: sonmTokenAddress,
            symbol: 'SNM',
            name: 'SONM',
            decimals: '18',
        };

        this.list.push(info);
        info.contract = initContract('token', this.gethClient, sonmTokenAddress);

        const token = new Token({gethClient: this.gethClient});
        token.setData(info);
        this.tokens[sonmTokenAddress] = token;
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
        }
    }

    async remove(address) {
        if (this.tokens[address]) {
            delete this.tokens[address];
            this.list = this.list.filter(item => item.address !== address);
        }
    }

    async getTokenInfo(address, accounts = null) {
        const token = new Token({gethClient: this.gethClient});
        await token.init(address);

        const tokenInfo = await token.init(address);

        if (accounts) {
            if (!Array.isArray(accounts)) {
                accounts = [accounts];
            }

            tokenInfo.balance = new BN(0);
            const requests = [];
            for (const account of accounts) {
                requests.push(token.getBalance(account));
            }

            const balancies = await Promise.all(requests);

            for (const balance of balancies) {
                tokenInfo.balance = tokenInfo.balance.add(new BN(balance));
            }

            tokenInfo.balance = tokenInfo.balance.toString(10);
        }

        try {
            return tokenInfo;
        } catch (err) {
            throw err;
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
