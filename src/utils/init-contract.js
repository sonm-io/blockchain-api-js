'use strict';

const invariant = require('fbjs/lib/invariant');
const contract = require('truffle-contract');

const contractToken = require('../../contracts/SNMT.json');
const contractVotingRegistry = require('../../contracts/VotingRegistry.json');
const contractVoting = require('../../contracts/Voting.json');

//init contracts
const contracts = {
  token: contractToken,
  votingRegistry: contractVotingRegistry,
  voting: contractVoting
};

module.exports = async function (name, gethClient) {
  invariant(gethClient, 'gethClient is not defined');
  invariant(name, 'set current contract name');

  const contractObject = contract(contracts[name]);
  contractObject.setProvider(gethClient.provider);

  return contractObject;
};