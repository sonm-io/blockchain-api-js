const Account = require('./src/entity/Account');
const TokenList = require('./src/entity/TokenList');
const add0x = require('./src/utils/add-0x');
const GethClient = require('./src/GethClient');
const recoverPrivateKey = require('./src/utils/recover-private-key.js');
const newAccount = require('./src/utils/new-account.js');
const TransactionResult = require('./src/TransactionResult');

const config = require('./config');

function createSonmFactory(remoteEthNodeUrl, chainId = 'live', privateChain = false, params = {}) {
    const gethClient = new GethClient(remoteEthNodeUrl, chainId);
    const chainConfig = config[chainId + (privateChain ? '_private' : '')];

    const ctrArguments = {
        gethClient,
        config: chainConfig,
        sonmTokenAddress: chainConfig.contractAddress.token,
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
        const tokenList = new TokenList({
            gethClient,
        });

        await tokenList.initSonmToken(chainConfig.contractAddress.token);

        return tokenList;
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
