'use strict';

const Buffer = require('buffer').Buffer;
const scryptjs = require('scrypt-async');
const sha3 = require('js-sha3').keccak256;
const bcrypto = require('browserify-aes');

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

    //const mac = sha3(Buffer.concat([derivedKey.slice(16, 32), ciphertext]));
    const mac = sha3(Buffer.concat([Buffer.from(derivedKey.slice(16, 32)), ciphertext]));

    if (mac !== json.crypto.mac) {
        throw new Error('Key derivation failed - possibly wrong passphrase')
    }

    const decipher = bcrypto.createDecipheriv(json.crypto.cipher, derivedKey.slice(0, 16), new Buffer(json.crypto.cipherparams.iv, 'hex'))

    //let privateKey = Buffer.concat([decipher.update(ciphertext), decipher.final()])
    let privateKey = Buffer.concat([Buffer.from(decipher.update(ciphertext)), Buffer.from(decipher.final())])

    while (privateKey.length < 32) {
        privateKey = Buffer.concat([new Buffer([0x00]), privateKey]);
    }

    return privateKey.toString('hex');
};