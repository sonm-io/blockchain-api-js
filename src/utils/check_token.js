'use strict';

const Contract = require('truffle-contract');
const invariant = require('fbjs/lib/invariant');
const fs = require('fs-extra');

module.exports = async function isERC20(address, gethClient) {
  invariant(address, 'address is not defined');
  invariant(address.startsWith('0x'), 'address should starts with 0x');
  invariant(gethClient, 'gethClient is not defined');

  //check code
  if ( await gethClient.method('getCode')(address) !== '0x' ) {
    const contractObject = Contract(await fs.readJson(`${__dirname}/../../contracts/SNMT.json`));
    contractObject.setProvider(gethClient.provider);

    const contract = await contractObject.at(address);

    const [ name, symbol, decimals] = await Promise.all([
      await contract.name(),
      await contract.symbol(),
      await contract.decimals()
    ]);

    return {
      name,
      symbol,
      decimals,
    };
  } else {
    return false;
  }

  return result;
};