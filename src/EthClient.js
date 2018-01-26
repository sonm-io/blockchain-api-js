const invariant = require('fbjs/lib/invariant');
const fetch = require('node-fetch');
const fromHex = require('./utils/from-hex');
const Buffer = require('buffer').Buffer;
const EthereumTx = require('ethereumjs-tx');
const TransactionResult = require('./TransactionResult');

module.exports = class EthClient {
    constructor(url, timeout = 30000) {
        invariant(url, 'url is not defined');

        this.requestCounter = 1;
        this.url = url;
        this.timeout = timeout;
        this.privateKey = null;
    }

    async call(method, params = []) {
        const body = {
            method: method,
            jsonrpc: '2.0',
            params: params,
            id: this.requestCounter++
        };

        // const signTransaction = (rawTx, cb) => {
        //     return sign(rawTx, _privateKey, false)
        // };

        const response = await fetch(this.url, {
            timeout: this.timeout,
            method: 'POST',
            body: JSON.stringify(body),
            headers: { 'Content-Type': 'application/json' },
        });

        if(response.status === 200) {
            const json = await response.json();

            if (json.error) {
                throw Error(json.error.message);
            } else {
                return json.result;
            }
        } else {
            throw Error('Something wrong');
        }
    }

    async getGasPrice() {
        return fromHex(await this.call('eth_gasPrice'));
    }

    async getBalance(address) {
        const res = await this.call('eth_getBalance', [address, 'latest']);

        return fromHex(res);
    }

    async getCode(address) {
        return await this.call('eth_getCode', [address, 'latest']);
    }

    async getTransaction(hash) {
        return await this.call('eth_getTransaction', [hash]);
    }

    async getTransactionReceipt(hash) {
        return await this.call('eth_getTransactionReceipt', [hash]);
    }

    async getBlockNumber() {
        return await this.call('eth_blockNumber');
    }

    async getTransactionCount(address) {
        return fromHex(await this.call('eth_getTransactionCount', [address, 'latest']));
    }

    async sendTransaction(tx) {
        const privateKey = Buffer.from(this.privateKey, 'hex');
        const signer = new EthereumTx(tx);
        signer.sign(privateKey);

        const hash = await this.call('eth_sendRawTransaction', ['0x' + signer.serialize().toString('hex')]);
        return new TransactionResult(hash, this, tx);
    }

    setPrivateKey(privateKey) {
        this.privateKey = privateKey;
    }
};