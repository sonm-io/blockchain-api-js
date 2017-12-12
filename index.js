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
const environment = config.environment || 'development';

const createGethClient = memoize.memoize(function createGethClient(provider) {
    return new GethClient(provider);
});

const createProvider = memoize.memoize(providerFactory);

function createSonmFactory(remoteEthNodeUrl, params = {}) {
    const provider = createProvider(remoteEthNodeUrl);
    const gethClient = createGethClient(provider);

    const ctrArguments = {
        gethClient,
        config: config[environment],
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

        await account.addToken(config[environment].contractAddress.token);

        return account;
    }

    function createTxResult(hash) {
        return new TransactionResult(hash, gethClient);
    }

    function setPrivateKey(privateKey) {
        const privateKey0x = add0x(privateKey);
        provider.setPrivateKey(privateKey0x);
    }

    return {
        gethClient,
        createAccount,
        createTxResult,
        setPrivateKey
    };
};

function getSonmTokenAddress() {
    return config[environment].contractAddress.token;
}

module.exports = {
    createSonmFactory,
    utils: {
        recoverPrivateKey,
        add0x,
        newAccount,
        fromWei,
        toWei,
        getSonmTokenAddress,
    },
};