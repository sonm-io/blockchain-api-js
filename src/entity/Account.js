'use strict';

const invariant = require('fbjs/lib/invariant');
const TransactionResult = require('../TransactionResult');
const BN = require('bignumber.js');
const toHex = require('../utils/to-hex');
const isERC20 = require('../utils/check-token');
const add0x = require('../utils/add-0x');

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
        this.nonce = 0;

        this.sonmTokenContract = null;
    }

    async initSonmToken(address) {
        const check = await isERC20(address, this.geth);

        if (check) {
            this.sonmTokenContract = check.contract;
        } else {
            return false;
        }
    }

    async getBalance() {
        const result = await this.geth.method('getBalance')(this.getAddress());
        return result.toString();
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

    async requestTestTokens() {
        const gasLimit = toHex(await this.getGasLimit());
        const gasPrice = toHex(await this.getGasPrice());

        const addresses = Object.keys(this.tokens);
        return await this.sonmTokenContract.getTokens({
            from: this.getAddress(),
            gasLimit,
            gasPrice,
        });
    }

    async send(to, amount, tokenAddress, gasLimit, gasPrice) {
        if (!this.nonce) {
            this.nonce = await this.geth.method('getTransactionCount')(this.getAddress());
        }

        const value = toHex(amount);

        gasLimit = gasLimit || toHex(await this.getGasLimit());
        gasPrice = gasPrice || toHex(await this.getGasPrice());

        let tx = {};
        if (tokenAddress === '0x') {
            tx = {
                from: this.getAddress(),
                gasLimit,
                gasPrice,
                value,
                to: this.normalizeTarget(to),
                nonce: toHex(this.nonce),
            };
        } else {
            const request = await this.sonmTokenContract.transfer.request(this.normalizeTarget(to), value);
            tx = {
                from: this.getAddress(),
                gasLimit,
                gasPrice,
                value: 0,
                to: tokenAddress,
                nonce: toHex(this.nonce),
                data: request.params[0].data,
            };
        }

        this.nonce++;

        return this.geth.sendTransaction(tx);
    }

    async sendTokens(to, amount, tokenAddress, gasLimit, gasPrice) {
        //get first one
        if ( !tokenAddress ) {
            tokenAddress = Object.keys(this.tokens)[0];
        }

        return await this.send(to, amount, tokenAddress, gasLimit, gasPrice);
    }

    async sendEther(to, amount, gasLimit, gasPrice) {
        return await this.send(to, amount, '0x', gasLimit, gasPrice);
    }

    normalizeTarget(to) {
        return to instanceof Account
            ? to.address
            : add0x(to);
    }
}

module.exports = Account;