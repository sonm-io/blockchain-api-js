const providerFactory = require('./src/provider/signer-provider-factory');
const Account = require('./src/entity/Account');
const Votes = require('./src/entity/Votes');
const add0x = require('./src/utils/add-0x');
const GethClient = require('./src/GethClient');
const memoize = require('./src/utils/memoization');
const recoverPrivateKey = require('./src/utils/recover-private-key.js');

const config = require('./config');
const environment = config.environment || 'development';

const createGethClient = memoize.memoize(function createGethClient(provider) {
    return new GethClient(provider);
});

const createProvider = memoize.memoize(providerFactory);

/**
 * create API entity Account
 * @param {string} remoteEthNodeUrl
 * @param {string} address
 * @param {string} privateKey
 */
async function createAccount(remoteEthNodeUrl, address, privateKey, params = {}) {
    const address0x = add0x(address);
    const privateKey0x = add0x(privateKey);

    const provider = createProvider(remoteEthNodeUrl, address0x, privateKey0x);
    const gethClient = createGethClient(provider);

    const ctrArguments = {
        address0x,
        gethClient,
        config: config[environment],
    };

    Object.assign(ctrArguments, params);

    const account = new Account(ctrArguments);

    await account.addToken(config[environment].contractAddress.token)

    return account;
}

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

module.exports = {
    createAccount,
    createVotes,
    createProvider,
    createGethClient,
    utils: {
        recoverPrivateKey,
    },
};