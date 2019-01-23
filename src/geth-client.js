import invariant from 'fbjs/lib/invariant';
import { fromHex } from './utils/hex';
import { Buffer } from 'buffer';
const EthereumTx = require ('ethereumjs-tx');
import TransactionResult from './transaction-result';
const ethUtil = require('ethereumjs-util');

export class GethClient {

    /**
     * @param {string} url 
     */
    constructor(url) {
        invariant(url.length > 0, 'url is not defined');

        this.requestCounter = 1;
        this.url = url;
        
        /** @type {string} */
        this.privateKey = '';
        
        /** @type {object} */
        this.errors = {
            'intrinsic gas too low': 'sonmapi_gas_too_low',
            'insufficient funds for gas * price + value': 'sonmapi_insufficient_funds',
            'Failed to fetch': 'sonmapi_network_error',
        };
    }

    /**
     * @param {string} method 
     * @param {any[]} params 
     */
    async call(method, params = []) {
        const body = {
            method: method,
            jsonrpc: '2.0',
            params: params,
            id: this.requestCounter++
        };

        try {
            const response = await fetch(this.url, {
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
            console.error(err.message);

            const error = this.errors[err.message] ? this.errors[err.message] : 'sonmapi_unknown_error';

            throw Error(error);
        }
    }

    async getGasPrice() {
        return fromHex(await this.call('eth_gasPrice'));
    }

    /**
     * @param {string} address 
     */
    async getBalance(address) {
        const res = await this.call('eth_getBalance', [address, 'latest']);

        return fromHex(res);
    }

    /**
     * @param {string} address 
     */
    async getCode(address) {
        return await this.call('eth_getCode', [address, 'latest']);
    }

    /**
     * @param {string} hash 
     */
    async getTransaction(hash) {
        return await this.call('eth_getTransactionByHash', [hash]);
    }

    /**
     * @param {string} hash 
     */
    async getTransactionReceipt(hash) {
        return await this.call('eth_getTransactionReceipt', [hash]);
    }

    async getBlockNumber() {
        return await this.call('eth_blockNumber');
    }

    /**
     * @param {string} address 
     */
    async getTransactionCount(address) {
        return fromHex(await this.call('eth_getTransactionCount', [address, 'latest']));
    }

    /**
     * @param {any} tx 
     */
    async sendTransaction(tx) {
        const hash = await this.call('eth_sendRawTransaction', [this.getRawTransaction(tx)]);
        return new TransactionResult(hash, this, tx);
    }

    /**
     * @param {any} tx 
     */
    getRawTransaction(tx) {
        const privateKey = Buffer.from(this.privateKey, 'hex');
        const signer = new EthereumTx(tx);
        signer.sign(privateKey);

        return '0x' + signer.serialize().toString('hex');
    }

    /**
     * @param {string} message 
     */
    signMessage(message) {
        return ethUtil.ecsign(Buffer.from(message.substr(2), 'hex'), Buffer.from(this.privateKey, 'hex'));
    }

    async getNetVersion() {
        return await this.call('net_version');
    }

    /**
     * @param {string} privateKey 
     */
    setPrivateKey(privateKey) {
        this.privateKey = privateKey;
    }
};