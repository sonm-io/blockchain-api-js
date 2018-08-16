'use strict';

const invariant = require('fbjs/lib/invariant');
const BN = require('ethereumjs-util').BN;
const toHex = require('../utils/to-hex');
const add0x = require('../utils/add-0x');
const initContract = require('../utils/init-contract');

const GAS_LIMIT_DEFAULT = 200000;
const GAS_PRICE_MAX = '100000000000';
const MAX_ALLOWANCE = '440000000000000000000000000';
const ZERO_ADDRESS = '0x' + Array(41).join('0');

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
        this.contracts = {};
    }

    initContracts(contracts) {
        for(let type in contracts) {
            this.contracts[type] = initContract(type, this.gethClient, contracts[type]);
        }
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

        if (new BN(result).gt(this.limitGasPrice)) {

            if (this.throwGasPriceError) {
                throw new Error('Too much gas price ' + result);
            }

            result = GAS_PRICE_MAX;
        }

        return result;
    }

    async requestTestTokens() {
        const gasLimit = toHex(await this.getGasLimit());
        const gasPrice = toHex(await this.getGasPrice());

        const tx = await this.callContractMethod('faucet', 'getTokens', [], gasLimit, gasPrice);
        return tx.getReceipt();
    }

    async getTokenExchangeRate() {
        const gasLimit = toHex(await this.getGasLimit());
        const gasPrice = toHex(await this.getGasPrice());

        return (await this.contracts.oracleUSD.call('getCurrentPrice', [], this.getAddress(), gasLimit, gasPrice)).toString();
    }

    async buyOrder(id = 0, duration = 0) {
        await this.setAllowanceForMarket();

        const tx = await this.callContractMethod('market', 'QuickBuy', [id, duration], 4000000);
        return tx.getReceipt();
    }

    async closeDeal(id = 0, blackList = false) {
        const tx = await this.callContractMethod('market', 'CloseDeal', [id, blackList ? 1 : 0], 2000000);
        return tx.getReceipt();
    }

    async createChangeRequest(id = 0, newPrice, newDuration = '0') {
        const tx = await this.callContractMethod('market', 'CreateChangeRequest', [id, newPrice, newDuration], 2000000);
        return tx.getReceipt();
    }

    async cancelChangeRequest(id = 0) {
        const tx = await this.callContractMethod('market', 'CancelChangeRequest', [id], 2000000);
        return tx.getReceipt();
    }

    async confirmWorker(slaveId = '') {
        const tx = await this.callContractMethod('market', 'ConfirmWorker', [slaveId], 2000000);
        return tx.getReceipt();
    }

    async createOrder({orderType, counterPartyId = ZERO_ADDRESS, duration = 0, price, netflags = [], identityLevel = 1, blacklist = ZERO_ADDRESS, tag = '', benchmarks = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]}) {
        const tx = await this.callContractMethod('market', 'PlaceOrder', [orderType, counterPartyId, duration, price, netflags, identityLevel, blacklist, Buffer.from(tag, 'hex'), benchmarks], 2000000);
        return tx.getReceipt();
    }

    async setAllowanceForMarket() {
        await this.setAllowance(MAX_ALLOWANCE, this.contracts.market.address);
    }

    async getOrderParams(id = 0) {
        const gasLimit = toHex(await this.getGasLimit());
        const tx = await this.contracts.market.call('GetOrderParams', [id], this.getAddress(), gasLimit);

        return Object.assign({}, ...Object.keys(tx).map(item => ({[item]: tx[item].toString()})));
    }

    async send(to, amount, tokenAddress, gasLimit, gasPrice) {
        const tx = await this.generateTransaction(to, amount, tokenAddress, gasLimit, gasPrice);
        return this.gethClient.sendTransaction(tx);
    }

    async callContractMethod(contract, method, params, gasLimit, gasPrice) {
        if (!this.nonce) {
            this.nonce = await this.gethClient.getTransactionCount(this.getAddress());
        }

        gasLimit = toHex(gasLimit || (await this.getGasLimit()));
        gasPrice = toHex(gasPrice || (await this.getGasPrice()));

        const tx = {
            data: await this.contracts[contract].encode(method, params),
            from: this.getAddress(),
            gasLimit,
            gasPrice,
            value: 0,
            to: this.contracts[contract].address,
            nonce: toHex(this.nonce),
        };

        this.nonce++;

        return this.gethClient.sendTransaction(tx);
    }
    async getGasParams(limit, price) {
        return Promise.all([
                limit === undefined ? await this.getGasLimit() : limit,
                price === undefined ? await this.getGasPrice() : price,
            ]);    
    }

    async getGasParamsAsHex(limit, price) {
        const [l, p] = await this.getGasParams(limit, price);

        return [toHex(l), toHex(p)];
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
	        const data = await this.contracts.token.encode('transfer', [this.normalizeTarget(to), value]);
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

    async setAllowance(amount, address, gasLimit, gasPrice) {
        gasLimit = toHex(gasLimit || (await this.getGasLimit()));
        gasPrice = toHex(gasPrice || (await this.getGasPrice()));

        const existsAllowance = await this.contracts.token.call('allowance', [this.getAddress(), address], this.getAddress(), gasLimit, gasPrice);

        //reset allowance
        if (existsAllowance.lt(new BN(amount))) {
            const receipt = await this.approve(amount, address, gasLimit, gasPrice);
            return receipt.status === '0x1';
        } else {
            return true;
        }
    }

    async approveFast(amount, address, gasLimit, gasPrice) {
        const [limit, price] = await this.getGasParamsAsHex(gasLimit, gasPrice);

        const value = toHex(amount);

        const allowance = await this.callContractMethod('token', 'approve', [address, value], limit, price);
        return allowance.getReceipt();
    }

    async approve(amount, address, gasLimit, gasPrice) {
        const [limit, price] = await this.getGasParamsAsHex(gasLimit, gasPrice);

        const value = toHex(amount);

        let allowance = await this.callContractMethod('token', 'approve', [address, 0], limit, price);
        await allowance.getReceipt();

        allowance = await this.callContractMethod('token', 'approve', [address, value], limit, price);
        return allowance.getReceipt();
    }

    async migrateToken(amount, gasLimit, gasPrice) {
        const value = toHex(amount);
        gasLimit = toHex(gasLimit || (await this.getGasLimit()));
        gasPrice = toHex(gasPrice || (await this.getGasPrice()));

        let result = await this.setAllowance(amount, this.contracts.gate.address, gasLimit, gasPrice);
        if (result) {
            return this.callContractMethod('gate', 'Payin', [value], gasLimit, gasPrice);
        } else {
            return false;
        }
    }

    async getKYCLink(amount, address, gasLimit, gasPrice) {
        let receipt = await this.approveFast(amount, address, gasLimit, gasPrice);

        if (receipt.status === '0x1') {
            const sign = this.gethClient.signMessage(receipt.transactionHash);

            return `${this.getAddress()}/0x${sign.r.toString('hex')}${sign.s.toString('hex')}${sign.v.toString(16)}/${receipt.transactionHash}`; //0x${msg.toString('hex')
        } else {
            return '';
        }
    }

    normalizeTarget(to) {
        return to instanceof Account
            ? to.address
            : add0x(to);
    }
}

module.exports = Account;
