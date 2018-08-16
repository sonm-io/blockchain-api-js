'use strict';

const Buffer = require('safe-buffer').Buffer;
const scryptjs = require('scrypt-async');
const crypto = require('browserify-aes');
const ethUtil = require('ethereumjs-util');

module.exports = function (json, password) {
    let derivedKey;
    let kdfparams = json.crypto.kdfparams;

    if (json.crypto.kdf === 'scrypt') {
        scryptjs(password, new Buffer(kdfparams.salt, 'hex'), {
            "N": kdfparams.n,
            "r": kdfparams.r,
            "p": kdfparams.p,
            dklen: kdfparams.dklen,
            encoding: 'binary'
        }, key => {
            derivedKey = key;
        });
    } else {
        throw new Error('Unsupported key derivation scheme');
    }

    const ciphertext = new Buffer(json.crypto.ciphertext, 'hex');
    const mac = ethUtil.sha3(Buffer.concat([Buffer.from(derivedKey.slice(16, 32)), ciphertext])).toString('hex');

    if (mac !== json.crypto.mac) {
        throw new Error('Key derivation failed - possibly wrong passphrase')
    }

    const decipher = crypto.createDecipheriv(json.crypto.cipher, derivedKey.slice(0, 16), new Buffer(json.crypto.cipherparams.iv, 'hex'))
    const privateKey = Buffer.concat([Buffer.from(decipher.update(ciphertext)), Buffer.from(decipher.final())])

    return privateKey.toString('hex');
};