const SignerProvider = require('ethjs-provider-signer');
const {sign} = require('ethjs-signer');

module.exports = function create(remoteGethNodeUrl, accountAddress0x) {
    let _privateKey;

    const signTransaction = (rawTx, cb) => {
        return sign(rawTx, _privateKey, false)
    };

    const signedProvider = new SignerProvider(remoteGethNodeUrl, {
        signTransaction: (rawTx, cb) => cb(null, signTransaction(rawTx, false)),
        accounts: cb => cb(null, [accountAddress0x]),
    });

    signedProvider.setPrivateKey = function( privateKey ) {
        _privateKey = privateKey;
    };

    return signedProvider;
};

