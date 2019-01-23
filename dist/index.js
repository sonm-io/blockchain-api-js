'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var abi = require('ethjs-abi');
var invariant = _interopDefault(require('fbjs/lib/invariant'));
var buffer = require('buffer');

const BN = require('bn.js');

const fromHex = val => {
  if (val.substr(0, 2) === '0x') {
    val = val.substr(2);
  }

  return new BN(val, 16).toString(10);
};
const toHex = val => {
  return typeof val === 'string' && val.startsWith('0x') ? val : '0x' + new BN(val).toString(16);
};

const BN$1 = require('bn.js');
const MINUTE = 60 * 1000;
const MAX_TIMEOUT = MINUTE * 1000;

class TxResult {
  constructor(src, gethClient, txParams = null) {
    this._geth = gethClient;
    this._receipt = null;
    this._hash = '';
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
      this._txParams = await this._geth.getTransaction((await this.getHash()));
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
    return transaction.gasPrice ? new BN$1(fromHex(transaction.gasPrice)).mul(new BN$1(fromHex(receipt.gasUsed))).toString() : '0';
  }

  async getConfirmationsCount() {
    const [receipt, currentBlockNumber] = await Promise.all([this.getReceipt(), this._geth.getBlockNumber()]);
    return currentBlockNumber > receipt.blockNumber ? currentBlockNumber - receipt.blockNumber : 0;
  }

  async getReceipt() {
    let result;
    await this._promise;

    if (!this._receipt) {
      const hash = await this.getHash();
      const promise = new Promise((done, reject) => {
        const timeoutTask = setTimeout(() => reject(`getReceipt timeout: ${MAX_TIMEOUT}`), MAX_TIMEOUT);

        const check = async () => {
          const result = await this._geth.getTransactionReceipt(hash);

          if (result) {
            clearTimeout(timeoutTask);
            done(result);
          } else {
            setTimeout(check, 1000);
          }
        };

        check();
      });
      await promise.then(receipt => this._receipt = receipt);
    }

    result = this._receipt;
    return result;
  }

  async getInfo() {
    return this._geth.getTransaction((await this.getHash()));
  }

}

const EthereumTx = require('ethereumjs-tx');

const ethUtil = require('ethereumjs-util');

class GethClient {
  constructor(url) {
    invariant(url.length > 0, 'url is not defined');
    this.requestCounter = 1;
    this.url = url;
    this.privateKey = '';
    this.errors = {
      'intrinsic gas too low': 'sonmapi_gas_too_low',
      'insufficient funds for gas * price + value': 'sonmapi_insufficient_funds',
      'Failed to fetch': 'sonmapi_network_error'
    };
  }

  async call(method, params = []) {
    const body = {
      method: method,
      jsonrpc: '2.0',
      params: params,
      id: this.requestCounter++
    };

    try {
      const response = await fetch(this.url, {
        method: 'POST',
        body: JSON.stringify(body),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response && response.status === 200) {
        const json = await response.json();

        if (json.error) {
          throw Error(json.error.message);
        } else {
          return json.result;
        }
      } else {
        throw Error('sonmapi_node_fatal_error');
      }
    } catch (err) {
      console.error(err.message);
      const error = this.errors[err.message] ? this.errors[err.message] : 'sonmapi_unknown_error';
      throw Error(error);
    }
  }

  async getGasPrice() {
    return fromHex((await this.call('eth_gasPrice')));
  }

  async getBalance(address) {
    const res = await this.call('eth_getBalance', [address, 'latest']);
    return fromHex(res);
  }

  async getCode(address) {
    return await this.call('eth_getCode', [address, 'latest']);
  }

  async getTransaction(hash) {
    return await this.call('eth_getTransactionByHash', [hash]);
  }

  async getTransactionReceipt(hash) {
    return await this.call('eth_getTransactionReceipt', [hash]);
  }

  async getBlockNumber() {
    return await this.call('eth_blockNumber');
  }

  async getTransactionCount(address) {
    return fromHex((await this.call('eth_getTransactionCount', [address, 'latest'])));
  }

  async sendTransaction(tx) {
    const hash = await this.call('eth_sendRawTransaction', [this.getRawTransaction(tx)]);
    return new TxResult(hash, this, tx);
  }

  getRawTransaction(tx) {
    const privateKey = buffer.Buffer.from(this.privateKey, 'hex');
    const signer = new EthereumTx(tx);
    signer.sign(privateKey);
    return '0x' + signer.serialize().toString('hex');
  }

  signMessage(message) {
    return ethUtil.ecsign(buffer.Buffer.from(message.substr(2), 'hex'), buffer.Buffer.from(this.privateKey, 'hex'));
  }

  async getNetVersion() {
    return await this.call('net_version');
  }

  setPrivateKey(privateKey) {
    this.privateKey = privateKey;
  }

}

class Contract {
  constructor(json, address0x, gethClient) {
    invariant(!!json, 'abi is not defined');
    invariant(!!gethClient, 'gethClient is not defined');
    invariant(address0x.length > 0, 'address is not defined');
    invariant(address0x.startsWith('0x'), 'address should starts with 0x');
    this.gethClient = gethClient;
    this.address = address0x;
    this.abi = {};

    for (let item of json.abi) {
      this.abi[item.name] = item;
    }
  }

  async call(method, params = [], from = undefined, gasLimit = undefined, gasPrice = undefined) {
    const requestParams = [{
      to: this.address,
      data: this.encode(method, params),
      from,
      gasLimit,
      gasPrice
    }, 'latest'];
    const response = await this.gethClient.call('eth_call', requestParams);
    const encoded = Object.values(abi.decodeMethod(this.abi[method], response));

    if (this.abi[method].outputs.length === 1) {
      return encoded[0];
    } else {
      const result = {};
      this.abi[method].outputs.map((item, index) => {
        result[item.name] = encoded[index];
      });
      return result;
    }
  }

  encode(method, params = []) {
    return abi.encodeMethod(this.abi[method], params);
  }

}
const contracts = {
  token: require('../contracts/snm.json'),
  gate: require('../contracts/gate.json'),
  oracleUSD: require('../contracts/oracleUSD.json'),
  market: require('../contracts/market.json'),
  faucet: require('../contracts/snm.json'),
  addressRegistry: require('../contracts/addressRegistry.json')
};
const initContract = (name, gethClient, address) => {
  invariant(!!gethClient, 'gethClient is not defined');
  invariant(name.length > 0, 'set current contract name');
  invariant(address.length > 0, 'address is not defined');
  invariant(address.startsWith('0x'), 'address should starts with 0x');
  return new Contract(contracts[name], address, gethClient);
};

class WrapperBase {
  constructor(contract) {
    this.contract = contract;
  }

}

const add0x = str => {
  if (typeof str === 'string' && !str.startsWith('0x')) {
    return '0x' + str;
  }

  return str;
};

class Token extends WrapperBase {
  async balanceOf(address) {
    return (await this.contract.call('balanceOf', [add0x(address)])).toString();
  }

}

class OracleUsd extends WrapperBase {
  async getCurrentPrice() {
    return (await this.contract.call('getCurrentPrice')).toString();
  }

}

const wrapperCtors = {
  token: Token,
  oracleUSD: OracleUsd
};
class SonmApi {
  constructor(config) {
    this.config = config;
    this.gethClient = new GethClient(config.remoteEthNodeUrl);
    this.contractAddresses = Object.create({});
    this.contracts = {};
    this.contracts.addressRegistry = initContract('addressRegistry', this.gethClient, config.addressRegistryAddress);
    this.wrappers = {};
  }

  get addressRegistry() {
    return this.contracts.addressRegistry;
  }

  async fillAddresses() {
    const names = this.config.namesOfcontractAddressGetters;
    const keys = Object.keys(names);
    keys.forEach(async function (contractName) {
      const methodName = names[contractName];
      const address = (await this.addressRegistry.call('read', [Buffer.from(methodName)], '0x' + Array(41).join('0'), toHex(1000000))).toLowerCase();
      this.contractAddresses[contractName] = address;
    }, this);
  }

  async init() {
    await this.fillAddresses();
  }

  initContracts(names) {
    names.forEach(name => {
      const contract = initContract(name, this.gethClient, this.contractAddresses[name]);
      this.contracts[name] = contract;

      if (wrapperCtors[name] !== undefined) {
        const ctor = wrapperCtors[name];
        this.wrappers[name] = new ctor(contract);
      }
    }, this);
  }

}

exports.SonmApi = SonmApi;
