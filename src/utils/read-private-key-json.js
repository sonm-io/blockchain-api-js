'use strict';

const scryptjs = require('scrypt-async');
const sha3 = require('js-sha3').keccak256;
const bcrypto = require('browserify-aes');

module.exports = function (json, password) {
    let derivedKey;
    let kdfparams = json.crypto.kdfparams;

    if (json.crypto.kdf === 'scrypt') {
        scryptjs(new Buffer(password), new Buffer(kdfparams.salt, 'hex'), {
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

    const mac = sha3(Buffer.concat([derivedKey.slice(16, 32), ciphertext]));
    if (mac !== json.crypto.mac) {
        throw new Error('Key derivation failed - possibly wrong passphrase')
    }

    const decipher = bcrypto.createDecipheriv(json.crypto.cipher, derivedKey.slice(0, 16), new Buffer(json.crypto.cipherparams.iv, 'hex'))

    let privateKey = Buffer.concat([decipher.update(ciphertext), decipher.final()])
    while (privateKey.length < 32) {
        privateKey = Buffer.concat([new Buffer([0x00]), privateKey]);
    }

    return privateKey.toString('hex');
};

/*

'use strict';

const keythereum = require("keythereum");
const fs = require("fs-extra");
const crypto = require("crypto");
const scrypt = require('scrypt');
const util = require('util');
const scryptsy = require('scryptsy');
//const scryptsy = util.promisify(require('scrypt-async'));
const jsscrypt = require('js-scrypt');
const scryptjs = require('scrypt-async');
const sha3 = require('js-sha3').keccak256;
const bcrypto = require('browserify-aes');
const csha3 = require('crypto-js/sha3');
const cryptojs = require("crypto-js");

const test = '4df8108cbf540c7275b12088da539b47c5ba5234a2ee63ba3d6227ec76badc1c1b90d3cb89c67e6b3838b5ea151a871f';
//
// console.log(cryptojs.enc.Hex.parse(test));
//
console.log(sha3(Buffer.from( test, 'hex' )));
console.log(Buffer.from( test, 'hex' ).toString());
console.log(csha3(cryptojs.enc.Hex.parse(test), { outputLength: 256 }).toString());
console.log(csha3(Buffer.from( test, 'hex' ).toString('utf16'), { outputLength: 256 }).toString());

//
process.exit();

function ab2str(buf) {
  var result = '';
  if (buf) {
    var bytes = new Uint8Array(buf);
    for (var i = 0; i < bytes.byteLength; i++) {
      result = result + String.fromCharCode(bytes[i]);
    }
  }
  return result;
}

let main = async function() {
  const path = '../../data/UTC--2017-10-02T09-54-40.195560128Z--88057f14236687831e1fd205e8efb9e45166fe72';
  let password = '11111111';

  console.log('Read file');

  const json = fs.readJsonSync(path);

  console.time('keythereum');

  try {
    const privateKey  = keythereum.recover(password, json);
    console.log('PrivateKey', privateKey.toString('hex'));

  } catch ( err ) {
    console.log(err.stack);
  }

  console.timeEnd('keythereum');

  console.time('scrypt node.js');

  var derivedKey
  var kdfparams

  try {

  if (json.crypto.kdf === 'scrypt') {

    kdfparams = json.crypto.kdfparams;
    //derivedKey = scryptsy(new Buffer(password), new Buffer(kdfparams.salt, 'hex'), kdfparams.n, kdfparams.r, kdfparams.p, kdfparams.dklen);
    //console.log(derivedKey);

    //console.timeEnd('plain1');
    //console.time('plain2');

    derivedKey = scrypt.hashSync(new Buffer(password),{"N": kdfparams.n,"r": kdfparams.r,"p": kdfparams.p}, kdfparams.dklen, new Buffer(kdfparams.salt, 'hex'));
    //console.log(derivedKey);

    //console.timeEnd('plain2');
  } else if (json.crypto.kdf === 'pbkdf2') {
    kdfparams = json.crypto.kdfparams
    if (kdfparams.prf !== 'hmac-sha256') {
      throw new Error('Unsupported parameters to PBKDF2')
    }
    derivedKey = crypto.pbkdf2Sync(new Buffer(password), new Buffer(kdfparams.salt, 'hex'), kdfparams.c, kdfparams.dklen, 'sha256')
  } else {
    throw new Error('Unsupported key derivation scheme');
  }

  var ciphertext = new Buffer(json.crypto.ciphertext, 'hex')
  //var mac = sha3(Buffer.concat([derivedKey.slice(16, 32), ciphertext]))

    //console.log(Buffer.concat([derivedKey.slice(16, 32), ciphertext]));
    var mac = sha3( Buffer.concat([derivedKey.slice(16, 32), ciphertext]));
  if (mac.toString('hex') !== json.crypto.mac) {
     throw new Error('Key derivation failed - possibly wrong passphrase')
  }

  var decipher = crypto.createDecipheriv(json.crypto.cipher, derivedKey.slice(0, 16), new Buffer(json.crypto.cipherparams.iv, 'hex'))

  var seed = Buffer.concat([decipher.update(ciphertext), decipher.final()])
  while (seed.length < 32) {
    var nullBuff = new Buffer([0x00]);
    seed = Buffer.concat([nullBuff, seed]);
  }

  console.log('PrivateKey', seed.toString('hex'));
  console.timeEnd('scrypt node.js');

  } catch ( err ) {
    console.log(err.stack);
  }

  let types = {
    //'jsscrypt': jsscrypt,
    'scryptsy': scryptsy,
    'scryptjs': scryptjs,
  };

  for ( let type in  types ) {
    console.time(type + ' + browserify-aes');

    try {

      if (json.crypto.kdf === 'scrypt') {
        kdfparams = json.crypto.kdfparams;

        if ( type === 'scryptsy' ) {
          derivedKey = types[type](new Buffer(password), new Buffer(kdfparams.salt, 'hex'), kdfparams.n, kdfparams.r, kdfparams.p, kdfparams.dklen);
        } else if ( type === 'jsscrypt' ) {
          derivedKey = types[type].crypto_scrypt(new Buffer(password), new Buffer(kdfparams.salt, 'hex'), kdfparams.n, kdfparams.r, kdfparams.p, kdfparams.dklen);
        } else {
          types[type](new Buffer(password), new Buffer(kdfparams.salt, 'hex'), {"N": kdfparams.n,"r": kdfparams.r,"p": kdfparams.p, dklen: kdfparams.dklen, encoding: 'binary'}, key => {
             derivedKey = key;
          });
        }

        //console.timeEnd('plain2');
      } else if (json.crypto.kdf === 'pbkdf2') {
        kdfparams = json.crypto.kdfparams
        if (kdfparams.prf !== 'hmac-sha256') {
          throw new Error('Unsupported parameters to PBKDF2')
        }
        derivedKey = crypto.pbkdf2Sync(new Buffer(password), new Buffer(kdfparams.salt, 'hex'), kdfparams.c, kdfparams.dklen, 'sha256')
      } else {
        throw new Error('Unsupported key derivation scheme');
      }

      var ciphertext = new Buffer(json.crypto.ciphertext, 'hex')

      // console.log(Buffer.concat([derivedKey.slice(16, 32), ciphertext]));
      // console.log(sha3(Buffer.concat([derivedKey.slice(16, 32), ciphertext])));
      // console.log(csha3(Buffer.concat([derivedKey.slice(16, 32), ciphertext]).toString('hex'), { outputLength: 256 }).toString());

      var mac = cryptojs.SHA3(cryptojs.enc.Hex.parse(Buffer.concat([derivedKey.slice(16, 32), ciphertext]).toString('hex')), { outputLength: 256 }).toString();

      if (mac !== json.crypto.mac) {
        throw new Error('Key derivation failed - possibly wrong passphrase')
      }

      var decipher = bcrypto.createDecipheriv(json.crypto.cipher, derivedKey.slice(0, 16), new Buffer(json.crypto.cipherparams.iv, 'hex'))

      var seed = Buffer.concat([decipher.update(ciphertext), decipher.final()])
      while (seed.length < 32) {
        var nullBuff = new Buffer([0x00]);
        seed = Buffer.concat([nullBuff, seed]);
      }
      //

      console.log('PrivateKey', seed.toString('hex'));
      console.timeEnd(type + ' + browserify-aes');

    } catch ( err ) {
      console.log(err.stack);
    }
  }




  // console.timeEnd('crypto-js');
  // var bytes  = CryptoJS.AES.decrypt(ciphertext.toString(), 'secret key 123');
  // var plaintext = bytes.toString(CryptoJS.enc.Utf8);
  // console.timeEnd('crypto-js');
};

main();


 */