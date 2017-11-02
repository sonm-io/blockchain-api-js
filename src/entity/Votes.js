'use strict';

const invariant = require('fbjs/lib/invariant');
const _ = require('lodash');
const toHex = require('../utils/to-hex');
const initContract = require('../utils/init-contract');

// const config = require('./config');
// const contract = require('truffle-contract');
// const add0x = require('./src/utils/add-0x');
// const GethClient = require('./src/GethClient');
// const memoize = require('./src/utils/memoization');
// const environment = config.environment || 'development';
//
// const contractVotingRegistry = require('./contracts/VotingRegistry.json');
// const contractVoting = require('./contracts/Voting.json');

class Votes {
  constructor({account, config}) {
    invariant(account, 'account is not defined');

    // invariant(address, 'account address is not defined');
    // invariant(gasLimit, 'gas limit is not defined');
    // invariant(gasPrice, 'gas price is not defined');

    //invariant(contracts.voting, 'voting contract is not defined');
    //invariant(contracts.votingRegistry && contracts.votingRegistry.constructor.name === "TruffleContract", 'Contract VotingRegistry is not valid');
    //invariant(contracts.token && contracts.token.constructor.name === "TruffleContract", 'Token contract is not valid');

    this._accountAddress = account.getAddress();
    this._geth = account.geth;
    this._gasLimit = account.getGasLimit();
    this._token = account.tokens.snmt;
    this._votes = {};
    this._currentVote = 0;
    this._config = config;
  }

  async init() {
    this._registry = await initContract('votingRegistry', this._geth);
    this._registry = await this._registry.at(this._config.contractAddress.votingRegistry);

    this._voting = await initContract('voting', this._geth);

    if (Object.keys(this._votes).length === 0) {
      const addresses = await this._registry.getVotings();

      for (const address of addresses) {
        if ( address !== '0x0000000000000000000000000000000000000001' ) {
          this._votes[address] = await this._voting.at(address);
        }
      }
    }

    return true;
  }

  async getList() {
    let result = [];
    for ( const address in this._votes ) {
      const {title, description} = await Promise.all([
        this._votes[address].getTitle(),
        this._votes[address].getDescription(),
      ]);

      result.push({
        address: address,
        title: title,
        description: description,
      })
    }

    return result;
  }

  setCurrent(address) {
    this._currentVote = address;
  }

  getCurrent() {
    return this._currentVote;
  }

  async getVoteInfo() {
    const vote = this._votes[this.getCurrent()];

    const [title, description] = await Promise.all([
      vote.getTitle(),
      vote.getDescription(),
    ]);

    let info = {
      title: title,
      description: description,
      options: [],
    };

    const options = await vote.getNumberOfOptions();

    for ( let i=0;i<options.toNumber();i++ ) {
      const [title, description, votes, weights] = await Promise.all([
        vote.getTitleFor(i),
        vote.getDescriptionFor(i),
        vote.getVotesFor(i),
        vote.getWeightsFor(i)
      ]);

      info.options.push({
        index: i,
        title: title,
        description: description,
        votes: votes.toNumber(),
        weight: weights.toNumber()
      });
    }

    return info;
  }

  async vote(option, qt = 1) {
    const vote = this._votes[this.getCurrent()];

    const params = {
      from: this._accountAddress,
      gasLimit: toHex(this._gasLimit),
    };

    const result = await this._token.contract.approve(this.getCurrent(), qt, params);

    if ( result ) {
      return await vote.voteFor(option, params);
    }
  }
}

module.exports = Votes;