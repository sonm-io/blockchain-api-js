'use strict';

const get = require('lodash/fp/get');
const invariant = require('fbjs/lib/invariant');
const TransactionResult = require('../TransactionResult');
const BN = require('bignumber.js');
const toHex = require('../utils/to-hex');
const isERC20 = require('../utils/check_token');

const getBalance = get('c[0]');
const GAS_LIMIT_DEFAULT = 200000;
const GAS_PRICE_MAX = new BN(100000000000);

class Account {
    constructor({gethClient, address0x, config, limitGasPrice = GAS_PRICE_MAX, throwGasPriceError = false}) {

        invariant(gethClient, 'gethClient is not defined');
        invariant(address0x, 'address is not defined');
        invariant(config, 'config is not defined');
        invariant(address0x.startsWith('0x'), 'address should starts with 0x');

        this.throwGasPriceError = throwGasPriceError;
        this.limitGasPrice = new BN(limitGasPrice);
        this.geth = gethClient;
        this.address = address0x;
        this.tokens = {};
        this.config = config;
    }

    async initTokens() {
        //init snm token
        for (const address of [this.config.contractAddress.token]) {
            await this.addToken(address);
        }
    }

    async addToken(address) {
        const contract = await isERC20(address, this.geth);

        if (contract) {
            this.tokens[contract.symbol.toLowerCase()] = contract;
        } else {
            return false;
        }
    }

    async getBalances() {
        let balances = {
            'ETH': await this.getBalance()
        };

        for (const code in this.tokens) {
            balances[code.toUpperCase()] = (await this.getTokenBalance(code)).toString();
        }

        return balances;
    }

    async getBalance() {
        const result = await this.geth.method('getBalance')(this.getAddress());

        return result
            ? String(result)
            : result;
    }

    async getTokenBalance(token = 'snmt') {
        const result = await this.tokens[token].contract.balanceOf(this.address);

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

    async sendTokens(to, amount, token = 'snmt') {
        const qty = toHex(amount);
        const gasLimit = toHex(await this.getGasLimit());
        const gasPrice = toHex(await this.getGasPrice());

        const resultPromise = this.tokens[token].contract.transfer(
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
            : to;
    }
}

module.exports = Account;