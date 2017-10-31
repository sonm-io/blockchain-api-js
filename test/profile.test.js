const {expect} = require('chai');
const sonmApi = require('../index');
const BN = require('bignumber.js');
const getPrivateKey = require('../src/utils/read-private-key-json');
const isERC20 = require('../src/utils/check_token');

const {createAccount, createVote} = sonmApi;

const URL_REMOTE_GETH_NODE = 'https://rinkeby.infura.io';

let VASYA, PETYA, VOTE;

const vasyaCfg = require('./data/Vasya_11111111.json');
const petyaCfg = require('./data/Petya_qazwsxedc.json');

before(async function () {
  this.timeout(+Infinity);

  console.log('Recover private keys...');
  const [vasyaPrivateKey, petyaPrivateKey] = await Promise.all([
    getPrivateKey(vasyaCfg, '11111111'),
    getPrivateKey(petyaCfg, 'qazwsxedc'),
  ]);
  console.log('done');

  console.log('Creating test accounts...');
  VASYA = await createAccount(URL_REMOTE_GETH_NODE, vasyaCfg.address, vasyaPrivateKey.toString('hex'), {limitGasPrice: new BN('30000000000')});
  PETYA = await createAccount(URL_REMOTE_GETH_NODE, petyaCfg.address, petyaPrivateKey.toString('hex'), {limitGasPrice: new BN('30000000000')});
  console.log('done');

  const gasPrice = await VASYA.getGasPrice();
  console.log('Gas price: ', gasPrice.toFormat());

  VOTE = await createVote(VASYA);
});

describe('Votes entity', function () {
  it('should get votes list', async function () {
    expect(await VOTE.getList()).to.be.an('array');
  });

  it('should get vote info', async function () {
    const list = await VOTE.getList();

    VOTE.setCurrent(list[0]);
    expect(await VOTE.getVoteInfo()).to.be.an('object')
  });
});

describe('Profile entity', function () {
  describe('ether', function () {
    it('should send ether from VASYA to PETYA', async function () {
      this.timeout(+Infinity);

      const qty = '1';

      const [vasyaBalance, petyaBalance] = await Promise.all([
        VASYA.getBalance(),
        PETYA.getBalance(),
      ]);

      console.log(`ether balance Vasya: ${vasyaBalance} Petya: ${petyaBalance}`);

      const txResult = await VASYA.sendEther(PETYA, qty);

      console.log(`transaction hash ${await txResult.getHash()}`);

      await txResult.getReceipt();

      const txPrice = await txResult.getTxPrice();

      const [newVasyaBalance, newPetyaBalance] = await Promise.all([
        VASYA.getBalance(),
        PETYA.getBalance(),
      ]);

      expect('' + newVasyaBalance).equal('' + new BN(vasyaBalance).minus(qty).minus(txPrice));
      expect('' + newPetyaBalance).equal('' + new BN(petyaBalance).plus(qty));
    });
  });

  describe('tokens', function () {
    it('should send sonm tokens from VASYA to PETYA', async function () {
      this.timeout(+Infinity);

      const qty = 2;

      const [vasyaBalance, petyaBalance] = await Promise.all([
        VASYA.getTokenBalance(),
        PETYA.getTokenBalance(),
      ]);

      console.log(`sonm balance Vasya: ${vasyaBalance.toString()} Petya: ${petyaBalance.toString()}`);

      // const txResult = await VASYA.sendTokens('0xED0D2eBc7B797c82D3A96A916fBfB5d526E0cE43', 100);
      // console.log(`transaction hash ${await txResult.getHash()}`);
      // const receipt = await txResult.getReceipt();
      // console.log(receipt);
      // console.log(await VASYA.voteGetVotingStatus());
      // console.log(await VASYA.voteGetVotes());
      // console.log(await VASYA.voteVoteForA());
      // console.log(await VASYA.voteGetVotes());
      // process.exit();

      const txResult = await VASYA.sendTokens(PETYA, qty);

      console.log(`transaction hash ${await txResult.getHash()}`);

      const receipt = await txResult.getReceipt();

      expect('' + await VASYA.getTokenBalance()).equal('' + new BN(vasyaBalance).minus(qty));
      expect('' + await PETYA.getTokenBalance()).equal('' + new BN(petyaBalance).plus(qty));
    });
  });

  describe('utils', function () {
    this.timeout(10000);

    it('should check smartContract on address', async function () {
      expect(await isERC20(VASYA.contracts.token.address, VASYA.geth)).to.be.an('object');
      expect(await isERC20(VASYA.getAddress(), VASYA.geth)).equal(false);
    });
  });
});
