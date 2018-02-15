const ethUtil = require('ethereumjs-util');
const Buffer = require('safe-buffer').Buffer;
const crypto = require('crypto-browserify');
const scryptjs = require('scrypt-async');

module.exports = function(passphrase = '', opts = {})
{
    if (!passphrase) {
        throw new Error('Need password');
    }

    const privateKey = new Buffer(crypto.randomBytes(32), 'hex');
    const publicKey = ethUtil.privateToPublic(privateKey);
    const address = ethUtil.publicToAddress(publicKey).toString('hex');

    const salt = crypto.randomBytes(32);
    const iv = crypto.randomBytes(16);
    const cipherType = opts.cipher || 'aes-128-ctr';

    const kdfparams = {
        dklen: opts.dklen || 32,
        salt: salt.toString('hex'),
    }

    kdfparams.n = opts.n || 262144;
    kdfparams.r = opts.r || 8;
    kdfparams.p = opts.p || 1;

    let derivedKey;

    scryptjs(passphrase, new Buffer(kdfparams.salt, 'hex'), {
        "N": kdfparams.n,
        "r": kdfparams.r,
        "p": kdfparams.p,
        dklen: kdfparams.dklen,
        encoding: 'binary'
    }, key => {
        derivedKey = key;
    });

    const cipher = crypto.createCipheriv(cipherType, derivedKey.slice(0, 16), iv);

    if (!cipher) {
        throw new Error('Unsupported cipher')
    }

    const ciphertext = Buffer.concat([cipher.update(privateKey), cipher.final()]);
    const mac = ethUtil.sha3(Buffer.concat([Buffer.from(derivedKey.slice(16, 32)), new Buffer(ciphertext, 'hex')]));

    return {
        version: 3,
        id: crypto.randomBytes(16).toString('hex'),
        address: address,
        crypto: {
            ciphertext: ciphertext.toString('hex'),
            cipherparams: {
                iv: iv.toString('hex')
            },
            cipher: cipherType,
            kdf: 'scrypt',
            kdfparams: kdfparams,
            mac: mac.toString('hex')
        }
    }
};