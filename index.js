const Account = require('./src/entity/Account');
const TokenList = require('./src/entity/TokenList');
const add0x = require('./src/utils/add-0x');
const GethClient = require('./src/GethClient');
const recoverPrivateKey = require('./src/utils/recover-private-key.js');
const newAccount = require('./src/utils/new-account.js');
const TransactionResult = require('./src/TransactionResult');
const { fromWei, toWei, toBigNumber } = require('./src/utils/format-ether');

const config = require('./config');

function createSonmFactory(remoteEthNodeUrl, chainId = 'live') {
    const gethClient = new GethClient(remoteEthNodeUrl);
    const chainConfig = config[chainId];

    async function createAccount(address) {
        const address0x = add0x(address);

        const account = new Account({
            address0x,
            gethClient,
        });

        await account.initSonmToken(chainConfig.contractAddress.token);

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
            sonmTokenAddress: chainConfig.contractAddress.token,
        });

        await tokenList.add(chainConfig.contractAddress.token);

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
        fromWei,
        toWei,
        toBigNumber,
    },
};