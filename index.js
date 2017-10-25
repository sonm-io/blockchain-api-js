const providerFactory = require('./src/provider/signer-provider-factory');
const Profile = require('./src/entity/Profile');
const config = require('./config');
const contract = require('truffle-contract');
const add0x = require('./src/utils/add-0x');
const GethClient = require('./src/GethClient');
const memoize = require('./src/utils/memoization');
const fs = require('fs-extra');
const path = require('path');
const environment = config.environment || 'development';

const createGethClient = memoize.memoize(function createGethClient(provider) {
  return new GethClient(provider);
});

const createProvider = memoize.memoize(providerFactory);

/**
 * create API entity Profile 
 * @param {string} remoteEthNodeUrl 
 * @param {string} address
 * @param {string} privateKey 
 */
async function createProfile(remoteEthNodeUrl, address, privateKey, params = {}) {
  const address0x = add0x(address);
  const privateKey0x = add0x(privateKey);
  const provider = createProvider(remoteEthNodeUrl, address0x, privateKey0x);
  const gethClient = createGethClient(provider);

  const ctrArguments = {
    provider,
    address0x,
    gethClient,
    contracts: {},
  };

  const dir = __dirname + '/contracts/';
  const files = fs.readdirSync(dir);

  for (const file of files) {
    if (file.includes(".json")) {
      const name = path.basename(file, '.json').toLowerCase();

      try {
        const contractObject = contract(await fs.readJson(`${dir}${file}`));
        contractObject.setProvider(provider);

        ctrArguments.contracts[name] = contractObject.at(config[environment].contractAddress[name]);
      } catch (err) {
        console.log('FAILED TO LOAD', file);
        console.log(err.stack);
      }
    }
  }

  Object.assign(ctrArguments, params);

  return new Profile(ctrArguments);
}

module.exports = {
  createProfile,
  createProvider,
  createGethClient,
};

