const providerFactory = require('./src/provider/signer-provider-factory');
const Account = require('./src/entity/Account');
const Votes = require('./src/entity/Votes');
const config = require('./config');
const contract = require('truffle-contract');
const add0x = require('./src/utils/add-0x');
const GethClient = require('./src/GethClient');
const memoize = require('./src/utils/memoization');
const environment = config.environment || 'development';
const recoverPrivateKey = require('./src/utils/recover-private-key.js');

const SnmToken = require('./contracts/SNMT.json');
const SnmVoting = require('./contracts/SonmVoting.json');

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

  for ( const name in contractsConfig ) {
    try {
      const contractObject = contract(contractsConfig[name]);
      contractObject.setProvider(provider);
      ctrArguments.contracts[name] = contractObject.at(config[environment].contractAddress[name]);
    } catch (err) {
      console.log('FAILED TO LOAD', name);
      console.log(err.stack);
    }
  }

  Object.assign(ctrArguments, params);

  return new Account(ctrArguments);
}

/**
 * create API entity Profile
 * @param {string} remoteEthNodeUrl
 * @param {string} address
 * @param {string} privateKey
 */
async function createVote(profile) {
  return new Votes(profile);
}

module.exports = {
  createAccount,
  createVote,
  createProvider,
  createGethClient,
  utils: {
    recoverPrivateKey,
  }
};