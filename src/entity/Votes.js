'use strict';

const invariant = require('fbjs/lib/invariant');

class Votes {
  constructor(profile) {
    invariant(profile, 'profile is not defined');
    invariant(profile.contracts.voting && profile.contracts.voting.constructor.name === "TruffleContract", 'sonmVotingContract is not valid');

    this.contract = profile.contracts.voting;
    this.profile = profile;
  }

  // async voteGetVotes() {
  //   return await this.contracts.sonmvoting.getVotes();
  // }
  //
  // async voteGetVotingStatus() {
  //   return await this.contracts.sonmvoting.getVotingSatus();
  // }
  //
  // async voteVoteForA(qt = 1) {
  //   const gasLimit = toHex(await this.getGasLimit());
  //   const params = { from: this.address, gasLimit: gasLimit };
  //
  //   const result = await this.contracts.snmt.approve(this.contracts.sonmvoting.address, qt, params);
  //
  //   if ( result ) {
  //     return await this.contracts.sonmvoting.voteForA(params);
  //   }
  // }

  async getList() {
    return [
      'voteAddress1',
      'voteAddress2',
    ];
  }

  async setCurrent(address) {
    this._currentVote = address;
  }

  async getVoteInfo() {
    return {
      question: 'WTF??',
      answers: [
        ['yes', 12],
        ['no', 14],
        ['maybe', 20],
      ]
    }
  }

  async vote( answer ) {
    return await this._currentVote.vote(answer);
  }
}

module.exports = Votes;