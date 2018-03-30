const invariant = require('fbjs/lib/invariant');
const fromHex = require('./utils/from-hex');
const Buffer = require('buffer').Buffer;
const EthereumTx = require('ethereumjs-tx');
const TransactionResult = require('./TransactionResult');

module.exports = class GethClient {

    constructor(url, timeout = 30000) {
        invariant(url, 'url is not defined');

        this.requestCounter = 1;
        this.url = url;
        this.timeout = timeout;
        this.privateKey = null;
        this.errors = {
            'intrinsic gas too low': 'sonmapi_gas_too_low',
            'insufficient funds for gas * price + value': 'sonmapi_insufficient_funds',
            'Failed to fetch': 'sonmapi_network_error',
        };
    }

    async call(method, params = []) {
        const body = {
            method: method,
            jsonrpc: '2.0',
            params: params,
            id: this.requestCounter++
        };

        try {
            const response = await fetch(this.url, {
                timeout: this.timeout,
                method: 'POST',
                body: JSON.stringify(body),
                headers: { 'Content-Type': 'application/json' },
            });

            if(response && response.status === 200) {
                const json = await response.json();

                if (json.error) {
                    throw Error(json.error.message);
                } else {
                    return json.result;
                }
            } else {
                throw Error('sonmapi_node_fatal_error');
            }
        } catch(err) {
            const error = this.errors[err.message] ? this.errors[err.message] : 'sonmapi_unknown_error';

            throw Error(error);
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
        return await this.call('eth_getTransactionByHash', [hash]);
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
        const hash = await this.call('eth_sendRawTransaction', [this.getRawTransaction(tx)]);
        return new TransactionResult(hash, this, tx);
    }

    getRawTransaction(tx) {
        const privateKey = Buffer.from(this.privateKey, 'hex');
        const signer = new EthereumTx(tx);
        signer.sign(privateKey);

        return '0x' + signer.serialize().toString('hex');
    }

    async getNetVersion() {
        return await this.call('net_version');
    }

    setPrivateKey(privateKey) {
        this.privateKey = privateKey;
    }
};