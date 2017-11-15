const providerFactory = require('./src/provider/provider-factory');
const Account = require('./src/entity/Account');
const Votes = require('./src/entity/Votes');
const add0x = require('./src/utils/add-0x');
const GethClient = require('./src/GethClient');
const memoize = require('./src/utils/memoization');
const recoverPrivateKey = require('./src/utils/recover-private-key.js');
const TransactionResult = require('./src/TransactionResult');

const config = require('./config');
const environment = config.environment || 'development';

const createGethClient = memoize.memoize(function createGethClient(provider) {
    return new GethClient(provider);
});

const createProvider = memoize.memoize(providerFactory);

/**
 * create API entity Votes
 * @param {string} address
 */
async function createVotes(account) {
    const votes = new Votes({
        account,
        config: config[environment]
    });

    await votes.init();

    return votes;
}

function createClient(remoteEthNodeUrl, address, params = {}) {
    const address0x = add0x(address);

    const provider = createProvider(remoteEthNodeUrl);
    const gethClient = createGethClient(provider);

    const ctrArguments = {
        address0x,
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
    async function createAccount() {
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
        createAccount,
        createTxResult,
        setPrivateKey
    };
};


module.exports = {
    createClient,
    createVotes,
    utils: {
        recoverPrivateKey,
    },
};