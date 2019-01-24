import { Contract, initContract, TContractName } from './contract';
import { GethClient } from './geth-client'
import { toHex } from './utils/hex';
import { WrapperBase } from './contracts/wrapper-base';
import { Token } from './contracts/token';
import { OracleUsd } from './contracts/oracle-usd';
import { contractAddrGetters, chainConfig } from './config';

/**
 * @typedef {{
 *   remoteEthNodeUrl: string;
 *   addressRegistryAddress: string;
 *   namesOfcontractAddressGetters: { [key in TContractName]: string }
 * }} ISonmApiConfig
 */

/**
 * @type {Partial<{ [ key in TContractName ]: new (c: Contract) => WrapperBase }>}
 */
const wrapperCtors = {
    token: Token,
    oracleUSD: OracleUsd
}

export class SonmApi {

    /**
     * @param {ISonmApiConfig} config 
     */
    constructor(config) {
        this.config = config;
        this.gethClient = new GethClient(config.remoteEthNodeUrl);
        this.contractAddresses = Object.create({});
        /** @type {object} */
        this.contracts = {};
        this.contracts.addressRegistry = initContract('addressRegistry', this.gethClient, config.addressRegistryAddress);

        /** @type {Partial<{ [ key in TContractName ]: WrapperBase }>} */
        this.wrappers = {}
    }

    get addressRegistry () { return this.contracts.addressRegistry; }

    async fillAddresses () {
        const names = this.config.namesOfcontractAddressGetters;
        /** @type {TContractName[]} */
        // @ts-ignore
        const keys = Object.keys(names);
        for (let i = 0; i < keys.length; i++) {
            const contractName = keys[i];
            const methodName = names[contractName];
            const address = (await this.addressRegistry.call('read', [Buffer.from(methodName)], '0x' + Array(41).join('0'), toHex(1000000))).toLowerCase();
            this.contractAddresses[contractName] = address;
        }
    }

    async init () {
        await this.fillAddresses();
    }

    /**
     * @param {TContractName[]} names 
     */
    initContracts (names) {
        
        names.forEach(name => {
            const contract = initContract(name, this.gethClient, this.contractAddresses[name]);
            this.contracts[name] = contract;
            if (wrapperCtors[name] !== undefined) {
                const ctor = wrapperCtors[name];
                //@ts-ignore
                this.wrappers[name] = new ctor(contract);
            }
        }, this);
    }

    /**
     * @param {string} chainId 
     * @param {boolean} isPrivate 
     */
    static create (chainId, isPrivate = false) {
        const key = chainId + (isPrivate ? '_private' : '');
        const config = chainConfig[key];
        const addrGetters = isPrivate ? contractAddrGetters.sidechain : contractAddrGetters.mainchain;
        return new SonmApi({
            remoteEthNodeUrl: config.url,
            addressRegistryAddress: config.contractAddress.addressRegistry,
            namesOfcontractAddressGetters: addrGetters
        });
    }
} 
