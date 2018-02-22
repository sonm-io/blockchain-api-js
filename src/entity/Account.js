'use strict';

const invariant = require('fbjs/lib/invariant');
const BN = require('ethereumjs-util').BN;
const toHex = require('../utils/to-hex');
const add0x = require('../utils/add-0x');
const initContract = require('../utils/init-contract');

const GAS_LIMIT_DEFAULT = 200000;
const GAS_PRICE_MAX = new BN(100000000000);

class Account {
    constructor({gethClient, address0x, sonmTokenAddress, limitGasPrice = GAS_PRICE_MAX, throwGasPriceError = false}) {

        invariant(gethClient, 'gethClient is not defined');
        invariant(address0x, 'address is not defined');
        invariant(address0x.startsWith('0x'), 'address should starts with 0x');

        this.throwGasPriceError = throwGasPriceError;
        this.limitGasPrice = new BN(limitGasPrice);
        this.gethClient = gethClient;
        this.address = address0x;
        this.tokens = {};
        this.nonce = 0;

        this.sonmTokenAddress = sonmTokenAddress;
        this.sonmTokenContract = null;
    }

    initSonmToken(address) {
        this.sonmTokenContract = initContract('token', this.gethClient, address);
    }

    setPrivateKey(privateKey) {
        this.gethClient.setPrivateKey(privateKey);
    }

    async getBalance() {
        const result = await this.gethClient.getBalance(this.getAddress());
        return result.toString();
    }

    getAddress() {
        return this.address;
    }

    getGasLimit() {
        return GAS_LIMIT_DEFAULT;
    }

    async getGasPrice() {
        let result = await this.gethClient.getGasPrice();

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

        return await this.sonmTokenContract.call('getTokens', [], this.getAddress(), gasLimit, gasPrice);
    }

    async send(to, amount, tokenAddress, gasLimit, gasPrice) {
        const tx = await this.generateTransaction(to, amount, tokenAddress, gasLimit, gasPrice);

        return this.gethClient.sendTransaction(tx);
    }

    async generateTransaction(to, amount, tokenAddress, gasLimit, gasPrice) {
        if (!this.nonce) {
            this.nonce = await this.gethClient.getTransactionCount(this.getAddress());
        }

        const value = toHex(amount);

        gasLimit = toHex(gasLimit || (await this.getGasLimit()));
        gasPrice = toHex(gasPrice || (await this.getGasPrice()));

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
	        const data = await this.sonmTokenContract.encode('transfer', [this.normalizeTarget(to), value]);
            tx = {
                from: this.getAddress(),
                gasLimit,
                gasPrice,
                value: 0,
                to: tokenAddress,
                nonce: toHex(this.nonce),
                data,
            };
        }

        console.log(tx);

        this.nonce++;

        return tx;
    }

    async getRawTransaction(to, amount, tokenAddress, gasLimit, gasPrice) {
        const tx = await this.generateTransaction(to, amount, tokenAddress, gasLimit, gasPrice);
        return this.gethClient.getRawTransaction(tx);
    }

    async sendTokens(to, amount, tokenAddress, gasLimit, gasPrice) {
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
