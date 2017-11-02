'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var ethjsProviderSigner = _interopDefault(require('ethjs-provider-signer'));
var ethjsSigner = _interopDefault(require('ethjs-signer'));
var get = _interopDefault(require('lodash/fp/get'));
var invariant = _interopDefault(require('fbjs/lib/invariant'));
var bignumber = _interopDefault(require('bignumber.js'));
var truffleContract = _interopDefault(require('truffle-contract'));
var web3 = _interopDefault(require('web3'));
var buffer = _interopDefault(require('buffer'));
var scryptAsync = _interopDefault(require('scrypt-async'));
var jsSha3 = _interopDefault(require('js-sha3'));
var browserifyAes = _interopDefault(require('browserify-aes'));

const sign = ethjsSigner.sign;


var signerProviderFactory = function create(remoteGethNodeUrl, accountAddress0x, privateKey0x) {
  return new ethjsProviderSigner(remoteGethNodeUrl, {
    signTransaction: (rawTx, cb) => cb(null, sign(rawTx, privateKey0x, false)),
    accounts: cb => cb(null, [accountAddress0x])
  });
};

const MINUTE = 60 * 1000;
const MAX_TIMEOUT = MINUTE * 10;

class TxResult {
  constructor(src, gethClient, txParams = null) {
    this._geth = gethClient;
    this._receipt = null;
    this._hash = null;
    this._promise = null;

    if (txParams !== null) {
      this.validateTxParams(txParams);
    }
    this._txParams = txParams;

    if (src instanceof TxResult) {
      this._copyCtr(src);
    } else if (src instanceof Promise) {
      this._promise = src.then(result => this._processPromiseResult(result));
    } else if (TxResult.checkTxHash(src)) {
      this._hash = src;
    } else {
      throw new Error('Unknown transaction src');
    }
  }

  _copyCtr(txResult) {
    if (txResult._hash) {
      this._hash = txResult._hash;
    } else {
      this._promise = txResult._promise.then(result => this._processPromiseResult(result));
    }
  }

  _processPromiseResult(val) {
    if (TxResult.checkTxHash(val)) {
      this._hash = val;
    } else if (val && TxResult.checkTxReceipt(val.receipt)) {
      this._receipt = val.receipt;
      this._hash = val.receipt.transactionHash;
    }
  }

  static checkTxHash(src) {
    return typeof src === 'string' && src.startsWith('0x');
  }

  static checkTxReceipt(src) {
    return src instanceof Object && 'cumulativeGasUsed' in src;
  }

  async getHash() {
    await this._promise;

    return this._hash;
  }

  async getTransaction() {
    if (this._txParams === null) {
      this._txParams = await this._geth.method('getTransaction')((await this.getHash()));
      this.validateTxParams(this._txParams);
    }

    return this._txParams;
  }

  validateTxParams(txParams) {
    const valid = typeof txParams === 'object' && 'gasPrice' in txParams;

    if (!valid) {
      throw new Error('incorrect txParams');
    }
  }

  async getTxPrice() {
    const receipt = await this.getReceipt();
    const transaction = await this.getTransaction();

    return new bignumber(transaction.gasPrice).mul(receipt.gasUsed);
  }

  async getReceipt() {
    let result;

    await this._promise;

    if (!this._receipt) {
      const hash = await this.getHash();
      const promise = new Promise((done, reject) => {
        const timeoutTask = setTimeout(() => reject(`getReceipt timeout: ${MAX_TIMEOUT}`), MAX_TIMEOUT);

        const check = async () => {
          const result = await this._geth.method('getTransactionReceipt')(hash);

          if (result) {
            clearTimeout(timeoutTask);
            done(result);
          } else {
            setTimeout(check, this._getPollingInterval());
          }
        };

        check();
      });

      await promise.then(receipt => this._receipt = receipt);
    }

    result = this._receipt;

    return result;
  }

  _getPollingInterval() {
    const age = Date.now() - this.timestamp;

    const result = age > MINUTE ? MINUTE : 1000;

    return result;
  }

  async getInfo() {
    return this._geth.method('getTransaction')((await this.getHash()));
  }
}

var TransactionResult = TxResult;

var toHex = function toHex(val) {
  let result;

  if (typeof val === 'string' && val.startsWith('0x')) {
    result = val;
  } else {
    result = '0x' + new bignumber(val).toString(16);
  }

  return result;
};

'use strict';

const getBalance = get('c[0]');
const GAS_LIMIT_DEFAULT = 100000;
const GAS_PRICE_MAX = new bignumber(100000000000);

class Account {
  constructor({ gethClient, address0x, contracts, limitGasPrice = GAS_PRICE_MAX, throwGasPriceError = false }) {

    invariant(gethClient, 'gethClient is not defined');
    invariant(contracts.token && contracts.token.constructor.name === "TruffleContract", 'Token contract is not valid');
    invariant(address0x, 'address is not defined');
    invariant(address0x.startsWith('0x'), 'address should starts with 0x');

    this.throwGasPriceError = throwGasPriceError;
    this.limitGasPrice = new bignumber(limitGasPrice);
    this.geth = gethClient;
    this.contracts = contracts;
    this.address = address0x;
  }

  async getBalance() {
    const result = await this.geth.method('getBalance')(this.getAddress());

    return result ? String(result) : result;
  }

  async getTokenBalance() {
    const result = await this.contracts.token.balanceOf(this.address);

    return getBalance(result);
  }

  getAddress() {
    return this.address;
  }

  getGasLimit() {
    return GAS_LIMIT_DEFAULT;
  }

  async getGasPrice() {
    let result = await this.geth.method('getGasPrice')();

    if (result.gt(this.limitGasPrice)) {
      if (this.throwGasPriceError) {
        throw new Error('Too much gas price ' + result.toFormat());
      }
      result = GAS_PRICE_MAX;
    }

    return result;
  }

  async sendTokens(to, amount) {
    const qty = toHex(amount);
    const gasLimit = toHex((await this.getGasLimit()));
    const gasPrice = toHex((await this.getGasPrice()));

    const resultPromise = this.contracts.token.transfer(this.normalizeTarget(to), qty, {
      from: this.getAddress(),
      gasLimit,
      gasPrice
    });

    return new TransactionResult(resultPromise, this.geth);
  }

  async sendEther(to, amount) {
    const gasLimit = toHex((await this.getGasLimit()));
    const gasPrice = toHex((await this.getGasPrice()));
    const value = toHex(amount);

    const tx = {
      from: this.getAddress(),
      gasLimit,
      gasPrice,
      value,
      to: this.normalizeTarget(to)
    };

    return this.geth.sendTransaction(tx);
  }

  normalizeTarget(to) {
    return to instanceof Account ? to.address : to;
  }
}

var Account_1 = Account;

'use strict';

class Votes {
  constructor(profile) {
    invariant(profile, 'profile is not defined');
    invariant(profile.contracts.voting && profile.contracts.voting.constructor.name === "TruffleContract", 'sonmVotingContract is not valid');

    this.contract = profile.contracts.voting;
    this.profile = profile;
  }

  async getList() {
    return ['voteAddress1', 'voteAddress2'];
  }

  async setCurrent(address) {
    this._currentVote = address;
  }

  async getVoteInfo() {
    return {
      question: 'WTF??',
      answers: [['yes', 12], ['no', 14], ['maybe', 20]]
    };
  }

  async vote(answer) {
    return await this._currentVote.vote(answer);
  }
}

var Votes_1 = Votes;

var config = {
  "development": {
    "contractAddress": {
      "token": "0x225b929916daadd5044d5934936313001f55d8f0",
      "voting": "0x7c7af9128e752f406dc4e6b801a693052f4b520d"
    }
  }
};

var add0x = function add0x(str) {
  if (typeof str === 'string' && !str.startsWith('0x')) {
    return '0x' + str;
  }

  return str;
};

var callbackToPromise = function promisify(fn) {
  return (...args) => {
    return new Promise((done, reject) => {
      return fn(...args, (error, result) => {
        if (error) {
          reject(error);
        } else {
          done(result);
        }
      });
    });
  };
};

var createAsyncWeb3Methods = function createAsyncMethods(web3$$1, ...gethMethodNames) {
  return gethMethodNames.reduce((result, name) => {
    invariant(web3$$1.eth[name], `web3.eth.${name} is not exists`);

    result[name] = callbackToPromise(web3$$1.eth[name].bind(web3$$1.eth));

    return result;
  }, {});
};

var GethClient_1 = class GethClient {
  constructor(provider) {
    invariant(provider, 'provider is not defined');

    this.web3 = new web3(provider);
    this.provider = provider;
    this.methods = {};
    this.gasPrice = null;
  }

  method(methodName) {
    if (!this.methods[methodName]) {
      Object.assign(this.methods, createAsyncWeb3Methods(this.web3, methodName));
    }

    return this.methods[methodName];
  }

  async getGasPrice(force) {
    if (force || !this.gasPrice) {
      this.gasPrice = await this.method('getGasPrice')();
    }

    return this.gasPrice;
  }

  async sendTransaction(tx) {
    const hash = await this.method('sendTransaction')(tx);

    return new TransactionResult(hash, this, tx);
  }
};

const RESULT_KEY = {};
const memFunctions = new WeakMap();

function memoization(fn, ...args) {
  const keys = [fn, ...args];
  let set = memFunctions;
  while (keys.length) {
    const key = keys.shift();
    if (set.has(key)) {
      set = set.get(key);
    } else {
      const next = new Map();
      set.set(key, next);
      set = next;
    }
  }
  let result;
  if (set.has(RESULT_KEY)) {
    result = set.get(RESULT_KEY);
  } else {
    result = fn(...args);
    set.set(RESULT_KEY, result);
  }
  return result;
}

function memoize(fn) {
  return function (...args) {
    return fn(...args);
  };
}

var memoization_1 = {
  memoization: memoization,
  memoize: memoize
};

'use strict';

const Buffer = buffer.Buffer;

const sha3 = jsSha3.keccak256;

var recoverPrivateKey = function recoverPrivateKey(json, password) {
    let derivedKey;
    let kdfparams = json.crypto.kdfparams;

    if (json.crypto.kdf === 'scrypt') {
        scryptAsync(password, new Buffer(kdfparams.salt, 'hex'), {
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

    const mac = sha3(Buffer.concat([Buffer.from(derivedKey.slice(16, 32)), ciphertext]));

    if (mac !== json.crypto.mac) {
        throw new Error('Key derivation failed - possibly wrong passphrase');
    }

    const decipher = browserifyAes.createDecipheriv(json.crypto.cipher, derivedKey.slice(0, 16), new Buffer(json.crypto.cipherparams.iv, 'hex'));

    let privateKey = Buffer.concat([Buffer.from(decipher.update(ciphertext)), Buffer.from(decipher.final())]);

    while (privateKey.length < 32) {
        privateKey = Buffer.concat([new Buffer([0x00]), privateKey]);
    }

    return privateKey.toString('hex');
};

var contract_name = "SNMT";
var abi = [{ "constant": true, "inputs": [], "name": "name", "outputs": [{ "name": "", "type": "string" }], "payable": false, "type": "function" }, { "constant": false, "inputs": [{ "name": "_spender", "type": "address" }, { "name": "_value", "type": "uint256" }], "name": "approve", "outputs": [{ "name": "", "type": "bool" }], "payable": false, "type": "function" }, { "constant": true, "inputs": [], "name": "totalSupply", "outputs": [{ "name": "", "type": "uint256" }], "payable": false, "type": "function" }, { "constant": false, "inputs": [{ "name": "_from", "type": "address" }, { "name": "_to", "type": "address" }, { "name": "_value", "type": "uint256" }], "name": "transferFrom", "outputs": [{ "name": "", "type": "bool" }], "payable": false, "type": "function" }, { "constant": true, "inputs": [], "name": "INITIAL_SUPPLY", "outputs": [{ "name": "", "type": "uint256" }], "payable": false, "type": "function" }, { "constant": true, "inputs": [], "name": "decimals", "outputs": [{ "name": "", "type": "uint256" }], "payable": false, "type": "function" }, { "constant": false, "inputs": [{ "name": "_spender", "type": "address" }, { "name": "_subtractedValue", "type": "uint256" }], "name": "decreaseApproval", "outputs": [{ "name": "success", "type": "bool" }], "payable": false, "type": "function" }, { "constant": true, "inputs": [{ "name": "_owner", "type": "address" }], "name": "balanceOf", "outputs": [{ "name": "balance", "type": "uint256" }], "payable": false, "type": "function" }, { "constant": false, "inputs": [{ "name": "target", "type": "address" }, { "name": "mintedAmount", "type": "uint256" }], "name": "mintToken", "outputs": [], "payable": false, "type": "function" }, { "constant": true, "inputs": [], "name": "owner", "outputs": [{ "name": "", "type": "address" }], "payable": false, "type": "function" }, { "constant": true, "inputs": [], "name": "symbol", "outputs": [{ "name": "", "type": "string" }], "payable": false, "type": "function" }, { "constant": false, "inputs": [{ "name": "_to", "type": "address" }, { "name": "_value", "type": "uint256" }], "name": "transfer", "outputs": [{ "name": "", "type": "bool" }], "payable": false, "type": "function" }, { "constant": false, "inputs": [], "name": "getTokens", "outputs": [], "payable": false, "type": "function" }, { "constant": false, "inputs": [{ "name": "_spender", "type": "address" }, { "name": "_addedValue", "type": "uint256" }], "name": "increaseApproval", "outputs": [{ "name": "success", "type": "bool" }], "payable": false, "type": "function" }, { "constant": true, "inputs": [{ "name": "_owner", "type": "address" }, { "name": "_spender", "type": "address" }], "name": "allowance", "outputs": [{ "name": "remaining", "type": "uint256" }], "payable": false, "type": "function" }, { "constant": false, "inputs": [{ "name": "newOwner", "type": "address" }], "name": "transferOwnership", "outputs": [], "payable": false, "type": "function" }, { "inputs": [], "payable": false, "type": "constructor" }, { "anonymous": false, "inputs": [{ "indexed": true, "name": "previousOwner", "type": "address" }, { "indexed": true, "name": "newOwner", "type": "address" }], "name": "OwnershipTransferred", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": true, "name": "owner", "type": "address" }, { "indexed": true, "name": "spender", "type": "address" }, { "indexed": false, "name": "value", "type": "uint256" }], "name": "Approval", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": true, "name": "from", "type": "address" }, { "indexed": true, "name": "to", "type": "address" }, { "indexed": false, "name": "value", "type": "uint256" }], "name": "Transfer", "type": "event" }];
var unlinked_binary = "0x606060405260408051908101604052601281527f534f4e4d20546573746e657420546f6b656e00000000000000000000000000006020820152600490805161004b9291602001906100f4565b5060408051908101604052600481527f534e4d5400000000000000000000000000000000000000000000000000000000602082015260059080516100939291602001906100f4565b50601260065569152d02c7e14af680000060075534156100b257600080fd5b5b5b60038054600160a060020a03191633600160a060020a03161790555b6007546000818155600160a060020a0330168152600160205260409020555b610194565b828054600181600116156101000203166002900490600052602060002090601f016020900481019282601f1061013557805160ff1916838001178555610162565b82800160010185558215610162579182015b82811115610162578251825591602001919060010190610147565b5b5061016f929150610173565b5090565b61019191905b8082111561016f5760008155600101610179565b5090565b90565b610c8c806101a36000396000f300606060405236156100e35763ffffffff7c010000000000000000000000000000000000000000000000000000000060003504166306fdde0381146100e8578063095ea7b31461017357806318160ddd146101a957806323b872dd146101ce5780632ff2e9dc1461020a578063313ce5671461022f578063661884631461025457806370a082311461028a57806379c65068146102bb5780638da5cb5b146102df57806395d89b411461030e578063a9059cbb14610399578063aa6ca808146103cf578063d73dd623146103e4578063dd62ed3e1461041a578063f2fde38b14610451575b600080fd5b34156100f357600080fd5b6100fb610472565b60405160208082528190810183818151815260200191508051906020019080838360005b838110156101385780820151818401525b60200161011f565b50505050905090810190601f1680156101655780820380516001836020036101000a031916815260200191505b509250505060405180910390f35b341561017e57600080fd5b610195600160a060020a0360043516602435610510565b604051901515815260200160405180910390f35b34156101b457600080fd5b6101bc61057d565b60405190815260200160405180910390f35b34156101d957600080fd5b610195600160a060020a0360043581169060243516604435610583565b604051901515815260200160405180910390f35b341561021557600080fd5b6101bc61069d565b60405190815260200160405180910390f35b341561023a57600080fd5b6101bc6106a3565b60405190815260200160405180910390f35b341561025f57600080fd5b610195600160a060020a03600435166024356106a9565b604051901515815260200160405180910390f35b341561029557600080fd5b6101bc600160a060020a03600435166107a5565b60405190815260200160405180910390f35b34156102c657600080fd5b6102dd600160a060020a03600435166024356107c4565b005b34156102ea57600080fd5b6102f2610864565b604051600160a060020a03909116815260200160405180910390f35b341561031957600080fd5b6100fb610873565b60405160208082528190810183818151815260200191508051906020019080838360005b838110156101385780820151818401525b60200161011f565b50505050905090810190601f1680156101655780820380516001836020036101000a031916815260200191505b509250505060405180910390f35b34156103a457600080fd5b610195600160a060020a0360043516602435610911565b604051901515815260200160405180910390f35b34156103da57600080fd5b6102dd6109d6565b005b34156103ef57600080fd5b610195600160a060020a0360043516602435610aa4565b604051901515815260200160405180910390f35b341561042557600080fd5b6101bc600160a060020a0360043581169060243516610b49565b60405190815260200160405180910390f35b341561045c57600080fd5b6102dd600160a060020a0360043516610b76565b005b60048054600181600116156101000203166002900480601f0160208091040260200160405190810160405280929190818152602001828054600181600116156101000203166002900480156105085780601f106104dd57610100808354040283529160200191610508565b820191906000526020600020905b8154815290600101906020018083116104eb57829003601f168201915b505050505081565b600160a060020a03338116600081815260026020908152604080832094871680845294909152808220859055909291907f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b9259085905190815260200160405180910390a35060015b92915050565b60005481565b600080600160a060020a038416151561059b57600080fd5b50600160a060020a038085166000818152600260209081526040808320339095168352938152838220549282526001905291909120546105e1908463ffffffff610c0f16565b600160a060020a038087166000908152600160205260408082209390935590861681522054610616908463ffffffff610c2616565b600160a060020a03851660009081526001602052604090205561063f818463ffffffff610c0f16565b600160a060020a0380871660008181526002602090815260408083203386168452909152908190209390935590861691600080516020610c418339815191529086905190815260200160405180910390a3600191505b509392505050565b60075481565b60065481565b600160a060020a0333811660009081526002602090815260408083209386168352929052908120548083111561070657600160a060020a03338116600090815260026020908152604080832093881683529290529081205561073d565b610716818463ffffffff610c0f16565b600160a060020a033381166000908152600260209081526040808320938916835292905220555b600160a060020a0333811660008181526002602090815260408083209489168084529490915290819020547f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925915190815260200160405180910390a3600191505b5092915050565b600160a060020a0381166000908152600160205260409020545b919050565b60035433600160a060020a039081169116146107df57600080fd5b600160a060020a0380831660009081526001602052604080822080548501905581548401825560035490921691600080516020610c418339815191529084905190815260200160405180910390a3600354600160a060020a038084169116600080516020610c418339815191528360405190815260200160405180910390a35b5b5050565b600354600160a060020a031681565b60058054600181600116156101000203166002900480601f0160208091040260200160405190810160405280929190818152602001828054600181600116156101000203166002900480156105085780601f106104dd57610100808354040283529160200191610508565b820191906000526020600020905b8154815290600101906020018083116104eb57829003601f168201915b505050505081565b6000600160a060020a038316151561092857600080fd5b600160a060020a033316600090815260016020526040902054610951908363ffffffff610c0f16565b600160a060020a033381166000908152600160205260408082209390935590851681522054610986908363ffffffff610c2616565b600160a060020a038085166000818152600160205260409081902093909355913390911690600080516020610c418339815191529085905190815260200160405180910390a35060015b92915050565b600160a060020a0330166000908152600160205260409020546127109081901015610a0057610aa1565b600160a060020a03331660009081526001602052604090205462030d409010610a2857600080fd5b600160a060020a033016600090815260016020526040902054610a51908263ffffffff610c0f16565b600160a060020a03308116600090815260016020526040808220939093553390911681522054610a87908263ffffffff610c2616565b600160a060020a0333166000908152600160205260409020555b50565b600160a060020a033381166000908152600260209081526040808320938616835292905290812054610adc908363ffffffff610c2616565b600160a060020a0333811660008181526002602090815260408083209489168084529490915290819020849055919290917f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b92591905190815260200160405180910390a35060015b92915050565b600160a060020a038083166000908152600260209081526040808320938516835292905220545b92915050565b60035433600160a060020a03908116911614610b9157600080fd5b600160a060020a0381161515610ba657600080fd5b600354600160a060020a0380831691167f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e060405160405180910390a36003805473ffffffffffffffffffffffffffffffffffffffff1916600160a060020a0383161790555b5b50565b600082821115610c1b57fe5b508082035b92915050565b600082820183811015610c3557fe5b8091505b50929150505600ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa165627a7a7230582007bff83baeff7dc0e08d6b570a98cb8468e6ec4818642a574c080be753d430d40029";
var networks = { "4": { "events": { "0x8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0": { "anonymous": false, "inputs": [{ "indexed": true, "name": "previousOwner", "type": "address" }, { "indexed": true, "name": "newOwner", "type": "address" }], "name": "OwnershipTransferred", "type": "event" }, "0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925": { "anonymous": false, "inputs": [{ "indexed": true, "name": "owner", "type": "address" }, { "indexed": true, "name": "spender", "type": "address" }, { "indexed": false, "name": "value", "type": "uint256" }], "name": "Approval", "type": "event" }, "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef": { "anonymous": false, "inputs": [{ "indexed": true, "name": "from", "type": "address" }, { "indexed": true, "name": "to", "type": "address" }, { "indexed": false, "name": "value", "type": "uint256" }], "name": "Transfer", "type": "event" } }, "links": {}, "address": "0xcafc68d01c6b1a70206938a7dfa40cfc80781efe", "updated_at": 1506598783329 }, "1506596317186": { "events": { "0x8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0": { "anonymous": false, "inputs": [{ "indexed": true, "name": "previousOwner", "type": "address" }, { "indexed": true, "name": "newOwner", "type": "address" }], "name": "OwnershipTransferred", "type": "event" }, "0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925": { "anonymous": false, "inputs": [{ "indexed": true, "name": "owner", "type": "address" }, { "indexed": true, "name": "spender", "type": "address" }, { "indexed": false, "name": "value", "type": "uint256" }], "name": "Approval", "type": "event" }, "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef": { "anonymous": false, "inputs": [{ "indexed": true, "name": "from", "type": "address" }, { "indexed": true, "name": "to", "type": "address" }, { "indexed": false, "name": "value", "type": "uint256" }], "name": "Transfer", "type": "event" } }, "links": {}, "address": "0x7c6c4a8dfdfbe3bad7b0877f118294e6570b4529", "updated_at": 1506596321888 }, "1506596389844": { "events": { "0x8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0": { "anonymous": false, "inputs": [{ "indexed": true, "name": "previousOwner", "type": "address" }, { "indexed": true, "name": "newOwner", "type": "address" }], "name": "OwnershipTransferred", "type": "event" }, "0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925": { "anonymous": false, "inputs": [{ "indexed": true, "name": "owner", "type": "address" }, { "indexed": true, "name": "spender", "type": "address" }, { "indexed": false, "name": "value", "type": "uint256" }], "name": "Approval", "type": "event" }, "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef": { "anonymous": false, "inputs": [{ "indexed": true, "name": "from", "type": "address" }, { "indexed": true, "name": "to", "type": "address" }, { "indexed": false, "name": "value", "type": "uint256" }], "name": "Transfer", "type": "event" } }, "links": {}, "address": "0x6d601f11dd6edbecc3736a4788a945682e8d88cf", "updated_at": 1506597282623 } };
var schema_version = "0.0.5";
var updated_at = 1506598783329;
var SNMT = {
	contract_name: contract_name,
	abi: abi,
	unlinked_binary: unlinked_binary,
	networks: networks,
	schema_version: schema_version,
	updated_at: updated_at
};

var SNMT$1 = Object.freeze({
	contract_name: contract_name,
	abi: abi,
	unlinked_binary: unlinked_binary,
	networks: networks,
	schema_version: schema_version,
	updated_at: updated_at,
	default: SNMT
});

var contract_name$1 = "SonmVoting";
var abi$1 = [{ "constant": true, "inputs": [], "name": "getVotingSatus", "outputs": [{ "name": "", "type": "uint8" }], "payable": false, "type": "function" }, { "constant": true, "inputs": [], "name": "getVotes", "outputs": [{ "name": "", "type": "uint256" }, { "name": "", "type": "uint256" }, { "name": "", "type": "uint256" }], "payable": false, "type": "function" }, { "constant": false, "inputs": [], "name": "voteForC", "outputs": [], "payable": false, "type": "function" }, { "constant": true, "inputs": [], "name": "getWeights", "outputs": [{ "name": "", "type": "uint256" }, { "name": "", "type": "uint256" }, { "name": "", "type": "uint256" }], "payable": false, "type": "function" }, { "constant": false, "inputs": [], "name": "voteForB", "outputs": [], "payable": false, "type": "function" }, { "constant": false, "inputs": [], "name": "voteForA", "outputs": [], "payable": false, "type": "function" }, { "constant": false, "inputs": [], "name": "withdrawSonm", "outputs": [], "payable": false, "type": "function" }, { "inputs": [{ "name": "tokenAddress", "type": "address" }, { "name": "blockStart", "type": "uint256" }, { "name": "blockEnd", "type": "uint256" }], "payable": false, "type": "constructor" }];
var unlinked_binary$1 = "0x6060604052341561000f57600080fd5b60405160608061062b8339810160405280805191906020018051919060200180519150505b6000829055600181905560028054600160a060020a031916600160a060020a0385161790555b5050505b6105be8061006d6000396000f300606060405236156100675763ffffffff60e060020a6000350416630a8ae45c811461006c5780630dc96015146100955780631ccfd4ed146100cc57806322acb867146100e1578063a98fe17e14610118578063cdcf3e8e1461012d578063d498109f14610142575b600080fd5b341561007757600080fd5b61007f610157565b60405160ff909116815260200160405180910390f35b34156100a057600080fd5b6100a861019a565b60405180848152602001838152602001828152602001935050505060405180910390f35b34156100d757600080fd5b6100df6101a9565b005b34156100ec57600080fd5b6100a8610271565b60405180848152602001838152602001828152602001935050505060405180910390f35b341561012357600080fd5b6100df610280565b005b341561013857600080fd5b6100df610348565b005b341561014d57600080fd5b6100df610410565b005b60008054431015801561016b575060015443105b1561017a5760015b9050610197565b6001544310610191576002610173565b9050610197565b60005b90505b90565b6003546004546005545b909192565b6000805443101580156101bd575060015443105b15156101c857600080fd5b600254600160a060020a031663dd62ed3e333060006040516020015260405160e060020a63ffffffff8516028152600160a060020a03928316600482015291166024820152604401602060405180830381600087803b151561022957600080fd5b6102c65a03f1151561023a57600080fd5b50505060405180519150506000811161025257600080fd5b61025b816104de565b60058054600101905560088054820190555b5b50565b6006546007546008545b909192565b600080544310158015610294575060015443105b151561029f57600080fd5b600254600160a060020a031663dd62ed3e333060006040516020015260405160e060020a63ffffffff8516028152600160a060020a03928316600482015291166024820152604401602060405180830381600087803b151561030057600080fd5b6102c65a03f1151561031157600080fd5b50505060405180519150506000811161032957600080fd5b610332816104de565b60048054600101905560078054820190555b5b50565b60008054431015801561035c575060015443105b151561036757600080fd5b600254600160a060020a031663dd62ed3e333060006040516020015260405160e060020a63ffffffff8516028152600160a060020a03928316600482015291166024820152604401602060405180830381600087803b15156103c857600080fd5b6102c65a03f115156103d957600080fd5b5050506040518051915050600081116103f157600080fd5b6103fa816104de565b60038054600101905560068054820190555b5b50565b60015460009043101561042257600080fd5b50600160a060020a03331660009081526009602052604081205490811161044857600080fd5b600160a060020a03338181166000908152600960205260408082208290556002549093169263a9059cbb92918591516020015260405160e060020a63ffffffff8516028152600160a060020a0390921660048301526024820152604401602060405180830381600087803b15156104be57600080fd5b6102c65a03f115156104cf57600080fd5b505050604051805150505b5b50565b600254600160a060020a03166323b872dd33308460006040516020015260405160e060020a63ffffffff8616028152600160a060020a0393841660048201529190921660248201526044810191909152606401602060405180830381600087803b151561054a57600080fd5b6102c65a03f1151561055b57600080fd5b50505060405180519050151561057057600080fd5b600160a060020a03331660009081526009602052604090208054820190555b505600a165627a7a72305820c0f6f6250f4025daa0c9b8e5301e1721fdc113ad8451ff6c4e0fd88d0431a1a90029";
var networks$1 = { "1508494438881": { "events": {}, "links": {}, "address": "0x445bb01827ce9ecdf8d03da3dbfa5a19451643ef", "updated_at": 1508494452017 } };
var schema_version$1 = "0.0.5";
var updated_at$1 = 1508495549060;
var SonmVoting = {
	contract_name: contract_name$1,
	abi: abi$1,
	unlinked_binary: unlinked_binary$1,
	networks: networks$1,
	schema_version: schema_version$1,
	updated_at: updated_at$1
};

var SonmVoting$1 = Object.freeze({
	contract_name: contract_name$1,
	abi: abi$1,
	unlinked_binary: unlinked_binary$1,
	networks: networks$1,
	schema_version: schema_version$1,
	updated_at: updated_at$1,
	default: SonmVoting
});

var SnmToken = ( SNMT$1 && SNMT ) || SNMT$1;

var SnmVoting = ( SonmVoting$1 && SonmVoting ) || SonmVoting$1;

const environment = config.environment || 'development';

const createGethClient = memoization_1.memoize(function createGethClient(provider) {
  return new GethClient_1(provider);
});

const createProvider = memoization_1.memoize(signerProviderFactory);

async function createAccount(remoteEthNodeUrl, address, privateKey, params = {}) {
  const address0x = add0x(address);
  const privateKey0x = add0x(privateKey);
  const provider = createProvider(remoteEthNodeUrl, address0x, privateKey0x);
  const gethClient = createGethClient(provider);

  const contractsConfig = {
    token: SnmToken,
    voting: SnmVoting
  };

  const ctrArguments = {
    provider,
    address0x,
    gethClient,
    contracts: {},
    contractsConfig
  };

  for (const name in contractsConfig) {
    try {
      const contractObject = truffleContract(contractsConfig[name]);
      contractObject.setProvider(provider);
      ctrArguments.contracts[name] = contractObject.at(config[environment].contractAddress[name]);
    } catch (err) {
      console.log('FAILED TO LOAD', name);
      console.log(err.stack);
    }
  }

  Object.assign(ctrArguments, params);

  return new Account_1(ctrArguments);
}

async function createVote(profile) {
  return new Votes_1(profile);
}

var blockchainApiJs = {
  createAccount,
  createVote,
  createProvider,
  createGethClient,
  utils: {
    recoverPrivateKey
  }
};

module.exports = blockchainApiJs;
