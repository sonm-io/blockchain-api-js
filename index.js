const providerFactory = require('./src/provider/provider-factory');
const Account = require('./src/entity/Account');
const add0x = require('./src/utils/add-0x');
const GethClient = require('./src/GethClient');
const memoize = require('./src/utils/memoization');
const recoverPrivateKey = require('./src/utils/recover-private-key.js');
const newAccount = require('./src/utils/new-account.js');
const TransactionResult = require('./src/TransactionResult');

const { fromWei, toWei } = require('./src/utils/format-ether');

const config = require('./config');

const createGethClient = memoize.memoize(function createGethClient(provider) {
    return new GethClient(provider);
});

const createProvider = memoize.memoize(providerFactory);

function createSonmFactory(remoteEthNodeUrl, chainId = 'live', params = {}) {
    const provider = createProvider(remoteEthNodeUrl);
    const gethClient = createGethClient(provider);
    const chainConfig = config[chainId];

    const ctrArguments = {
        gethClient,
        config: chainConfig,
    };

    Object.assign(ctrArguments, params);

    /**
     * create API entity Account
     * @param {string} remoteEthNodeUrl
     * @param {string} address
     * @param {string} privateKey
     */
    async function createAccount(address) {
        const address0x = add0x(address);

        ctrArguments.address0x = address0x;

        const account = new Account(ctrArguments);

        await account.addToken(chainConfig.contractAddress.token);

        return account;
    }

    function createTxResult(hash) {
        return new TransactionResult(hash, gethClient);
    }

    function setPrivateKey(privateKey) {
        const privateKey0x = add0x(privateKey);
        provider.setPrivateKey(privateKey0x);
    }

    function getSonmTokenAddress() {
        return chainConfig.contractAddress.token;
    }

    return {
        gethClient,
        createAccount,
        createTxResult,
        setPrivateKey,
        getSonmTokenAddress,
    };
};

module.exports = {
    createSonmFactory,
    utils: {
        recoverPrivateKey,
        add0x,
        newAccount,
        fromWei,
        toWei,
    },
};