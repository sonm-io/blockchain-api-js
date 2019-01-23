import * as abi from 'ethjs-abi';
import invariant from 'fbjs/lib/invariant';
import { GethClient } from './geth-client';

export class Contract {

    /**
     * @param {object} json Json ABI
     * @param {string} address0x Contract address
     * @param {GethClient} gethClient 
     */
    constructor(json, address0x, gethClient) {
        invariant(!!json, 'abi is not defined');
        invariant(!!gethClient, 'gethClient is not defined');
        invariant(address0x.length > 0, 'address is not defined');
        invariant(address0x.startsWith('0x'), 'address should starts with 0x');

        this.gethClient = gethClient;
        this.address = address0x;
        /** @type {object} */
        this.abi = {};

        for (let item of json.abi) {
            this.abi[item.name] = item;
        }
    }

    /**
     * 
     * @param {string} method 
     * @param {any[]} params 
     * @param {string | undefined} from 
     * @param {string|number|undefined} gasLimit 
     * @param {number|undefined} gasPrice 
     */
    async call(method, params = [], from = undefined, gasLimit = undefined, gasPrice = undefined) {
        const requestParams = [{
            to: this.address,
            data: this.encode(method, params),
            from,
            gasLimit,
            gasPrice,
        }, 'latest' ];

        const response = await this.gethClient.call('eth_call', requestParams);
        const encoded = Object.values(abi.decodeMethod(this.abi[method], response));

        if (this.abi[method].outputs.length === 1) {
            return encoded[0];
        } else {
            /** @type {object} */
            const result = {};

            this.abi[method].outputs.map((/**@type {any} */item, /**@type {number} */index) => {
                result[item.name] = encoded[index];
            });

            return result;
        }
    }

    /**
     * @param {string} method 
     * @param {any[]} params 
     */
    encode(method, params = []) {
        return abi.encodeMethod(this.abi[method], params);
    }
}

/** @typedef {'token'|'gate'|'oracleUSD'|'market'|'faucet'|'addressRegistry'} TContractName */

const contracts = {
    token: require('../contracts/snm.json'),
    gate: require('../contracts/gate.json'),
    oracleUSD: require('../contracts/oracleUSD.json'),
    market: require('../contracts/market.json'),
    faucet: require('../contracts/snm.json'),
    addressRegistry: require('../contracts/addressRegistry.json'),
};

/**
 * @param {TContractName} name 
 * @param {GethClient} gethClient 
 * @param {string} address 
 */
export const initContract = (name, gethClient, address) => {
    invariant(!!gethClient, 'gethClient is not defined');
    invariant(name.length > 0, 'set current contract name');
    invariant(address.length > 0, 'address is not defined');
    invariant(address.startsWith('0x'), 'address should starts with 0x');

    return new Contract(contracts[name], address, gethClient);
};