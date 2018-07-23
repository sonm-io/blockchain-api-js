const Account = require('./src/entity/Account');
const TokenList = require('./src/entity/TokenList');
const add0x = require('./src/utils/add-0x');
const GethClient = require('./src/GethClient');
const recoverPrivateKey = require('./src/utils/recover-private-key.js');
const newAccount = require('./src/utils/new-account.js');
const TransactionResult = require('./src/TransactionResult');
const initContract = require('./src/utils/init-contract.js');
const toHex = require('./src/utils/to-hex');

const config = require('./config');

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

function createSonmFactory(remoteEthNodeUrl, chainId = 'live', privateChain = false, params = {}) {
    const chainKey = chainId + (privateChain ? '_private' : '');
    const chainConfig = config[chainKey];
    const gethClient = new GethClient(remoteEthNodeUrl, chainId, privateChain);

    /**
     * create API entity Account
     * @param {string} remoteEthNodeUrl
     * @param {string} address
     * @param {string} privateKey
     */
    async function createAccount(address) {
        await getAddresses();

        const address0x = add0x(address);
        const ctrArguments = {
            gethClient,
            config: chainConfig,
            sonmTokenAddress: chainConfig.contractAddress.token,
            address0x,
        };

        Object.assign(ctrArguments, params);

        const account = new Account(ctrArguments);

        account.initContracts(chainConfig.contractAddress);

        return account;
    }

    function createTxResult(hash) {
        return new TransactionResult(hash, gethClient);
    }

    function setPrivateKey(privateKey) {
        gethClient.setPrivateKey(privateKey);
    }

    function getSonmTokenAddress() {
        return chainConfig.contractAddress.token;
    }

    async function createTokenList() {
        await getAddresses();

        const tokenList = new TokenList({
            gethClient,
        });

        await tokenList.initSonmToken(chainConfig.contractAddress.token);

        return tokenList;
    }

    async function getAddresses() {
        if (Object.keys(chainConfig.contractAddress).length <= 1) {
            const addressRegistry = initContract('addressRegistry', new GethClient(config[`${chainId}_private`].url, chainId, true), config[`${chainId}_private`].contractAddress.addressRegistry);
            const keys = privateChain ? KEYS.sidechain : KEYS.mainchain;

            for (const key in keys) {
                chainConfig.contractAddress[key] = (await addressRegistry.call('read', [Buffer.from(keys[key])], '0x' + Array(41).join('0'), toHex(1000000))).toLowerCase();
            }
        }
    }

    return {
        gethClient,
        createAccount,
        createTxResult,
        setPrivateKey,
        getSonmTokenAddress,
        createTokenList,
    };
};

module.exports = {
    createSonmFactory,
    utils: {
        recoverPrivateKey,
        add0x,
        newAccount,
    },
};
