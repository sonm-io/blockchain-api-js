const Contract = require ('../src/entity/Contract');
const tokenContract = require('../contracts/snm.json')
const {expect} = require('chai');
const GethClient = require('../src/GethClient');
const config = require('../config');
const initContract = require('../src/utils/init-contract');
const toHex = require('../src/utils/to-hex');
const add0x = require('../src/utils/add-0x');
const Account = require('../src/entity/Account');
const BN = require('ethereumjs-util').BN;

const KEYS = {
    mainchain: {
        token: 'masterchainSNMAddress',
        market: 'marketAddress',
        gate: 'gatekeeperMasterchainAddress',
        oracleUSD: 'oracleUsdAddress',
        faucet: 'testnetFauсetAddress',
    },
    sidechain: {
        token: 'sidechainSNMAddress',
        market: 'marketAddress',
        gate: 'gatekeeperSidechainAddress',
        oracleUSD: 'oracleUsdAddress',
        faucet: 'testnetFauсetAddress',
    }
};

const getChainConfig = (chainId, isPrivate = false) => {
    const key = chainId + (isPrivate ? '_private' : '');
    return config[key];
}

const createGethClient = (chainId, isPrivate = false) => {
    const chainConfig = getChainConfig(chainId, isPrivate);
    return new GethClient(chainConfig.url, chainId, isPrivate);
}

const getKeys = (isPrivate = false) => isPrivate ? KEYS.sidechain : KEYS.mainchain;

function getAddressRegistry (gethClient) {
    const chainConfig = getChainConfig(gethClient.chainId, gethClient.privateChain);
    return initContract('addressRegistry', gethClient, chainConfig.contractAddress.addressRegistry);
}

const getSonmTokenAddress = async (gethClient) => {
    const keys = getKeys(gethClient.privateChain);
    const addressRegistry = getAddressRegistry(gethClient);

    const sonmTokenAddress = (await addressRegistry.call('read', [Buffer.from(keys.token)], '0x' + Array(41).join('0'), toHex(1000000))).toLowerCase();
    return sonmTokenAddress;
}

async function fillAddresses(chainConfig, gethClient) {
    const keys = getKeys(gethClient.privateChain);
    const addressRegistry = getAddressRegistry(gethClient);
    for (const key in keys) {
        chainConfig.contractAddress[key] = (await addressRegistry.call('read', [Buffer.from(keys[key])], '0x' + Array(41).join('0'), toHex(1000000))).toLowerCase();
    }
}

async function getTokenExchangeRate(oracleUSD) {
    return (await oracleUSD.call('getCurrentPrice')).toString();
}

describe('Samples', () => {
    it('get balance for token', async () => {
        const gethClient = createGethClient('livenet', true);
        const sonmTokenAddress = await getSonmTokenAddress(gethClient);
        console.log(sonmTokenAddress);

        const snmTokenContract = initContract('token', gethClient, sonmTokenAddress);

        const address = '0xc5b40c87b25c1ba8c6f9ad0a62a5df930616ecc1'; // account address
        const balance = await snmTokenContract.call('balanceOf', [add0x(address)]);

        console.log(balance);
    });

    it('get rate (from Account)', async () => {
        const gethClient = createGethClient('livenet', true);
        const sonmTokenAddress = await getSonmTokenAddress(gethClient);
        console.log(sonmTokenAddress);
        const chainConfig = getChainConfig(gethClient.chainId, gethClient.privateChain);
        await fillAddresses(chainConfig, gethClient);

        const ZERO_ADDRESS = Array(41).join('0');

        const ctrArguments = {
            gethClient,
            config: chainConfig,
            sonmTokenAddress,
            address0x: add0x(ZERO_ADDRESS),
        };
        
        const account = new Account(ctrArguments);
        account.initContracts(chainConfig.contractAddress);

        const rate = await account.getTokenExchangeRate();
        console.log(rate);
    });

    it('get rate from oracleUSD contract', async () => {
        const gethClient = createGethClient('livenet', true);
        
        const chainConfig = getChainConfig(gethClient.chainId, gethClient.privateChain);
        await fillAddresses(chainConfig, gethClient);

        const oracleUsdContract = initContract('oracleUSD', gethClient, chainConfig.contractAddress.oracleUSD);
        const rate = (await oracleUsdContract.call('getCurrentPrice')).toString();

        console.log(rate);
    });
});