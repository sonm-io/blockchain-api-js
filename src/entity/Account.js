'use strict';

const get = require('lodash/fp/get');
const invariant = require('fbjs/lib/invariant');
const TransactionResult = require('../TransactionResult');
const BN = require('bignumber.js');
const toHex = require('../utils/to-hex');
const isERC20 = require('../utils/check-token');
const add0x = require('../utils/add-0x');

const getBalance = get('c[0]');
const GAS_LIMIT_DEFAULT = 200000;
const GAS_PRICE_MAX = new BN(100000000000);

class Account {
    constructor({gethClient, address0x, limitGasPrice = GAS_PRICE_MAX, throwGasPriceError = false}) {

        invariant(gethClient, 'gethClient is not defined');
        invariant(address0x, 'address is not defined');
        invariant(address0x.startsWith('0x'), 'address should starts with 0x');

        this.throwGasPriceError = throwGasPriceError;
        this.limitGasPrice = new BN(limitGasPrice);
        this.geth = gethClient;
        this.address = address0x;
        this.tokens = {};
    }

    async addToken(address) {
        const contract = await isERC20(address, this.geth);

        if (contract) {
            this.tokens[address] = contract;
        } else {
            return false;
        }
    }

    async getCurrencyBalances() {
        let requests = [
            this.getBalance()
        ];

        for (const address in this.tokens) {
            requests.push(this.getTokenBalance(address))
        }

        const results = await Promise.all(requests);

        const balances = {};

        for (let index in results) {
            const address = parseInt(index) === 0 ? '0x' : Object.keys(this.tokens)[index-1];
            balances[address] = results[index].toString()
        }

        return balances;
    }

    async getCurrencies() {
        let currencies = [{
            address: '0x',
            symbol: 'wei',
            name: 'Ethereum',
        }];

        for (const tokenAddress in this.tokens) {
            const token = this.tokens[tokenAddress];

            currencies.push({
                symbol: token.symbol.toLowerCase(),
                address: token.address,
                name: token.name,
            });
        }

        return currencies;
    }

    async getBalance() {
        const result = await this.geth.method('getBalance')(this.getAddress());

        return result
            ? String(result)
            : result;
    }

    async getTokenBalance(tokenAddress) {
        //get first one
        if ( !tokenAddress ) {
            tokenAddress = Object.keys(this.tokens)[0];
        }

        const result = await this.tokens[tokenAddress].contract.balanceOf(this.address);

        return getBalance(result);
    }

    getAddress() {
        return this.address;
    }

    getGasLimit() {
        return GAS_LIMIT_DEFAULT;
    }

    async getGasPrice() {
        let result = await this.geth.method('getGasPrice')();

        if (result.gt(this.limitGasPrice)) {
            if (this.throwGasPriceError) {
                throw new Error('Too much gas price ' + result.toFormat());
            }
            result = GAS_PRICE_MAX;
        }

        return result;
    }

    async sendTokens(to, amount, tokenAddress) {
        //get first one
        if ( !tokenAddress ) {
            tokenAddress = Object.keys(this.tokens)[0];
        }

        const qty = toHex(amount);
        const gasLimit = toHex(await this.getGasLimit());
        const gasPrice = toHex(await this.getGasPrice());

        const resultPromise = this.tokens[tokenAddress].contract.transfer(
            this.normalizeTarget(to),
            qty,
            {
                from: this.getAddress(),
                gasLimit,
                gasPrice,
            }
        );

        return new TransactionResult(resultPromise, this.geth);
    }

    async sendEther(to, amount) {
        const gasLimit = toHex(await this.getGasLimit());
        const gasPrice = toHex(await this.getGasPrice());
        const value = toHex(amount);

        const tx = {
            from: this.getAddress(),
            gasLimit,
            gasPrice,
            value,
            to: this.normalizeTarget(to),
        };

        return this.geth.sendTransaction(tx);
    }

    normalizeTarget(to) {
        return to instanceof Account
            ? to.address
            : add0x(to);
    }
}

module.exports = Account;