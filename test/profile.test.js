const { expect } = require('chai');
const sonmApi = require('../index');
const BN = require('bignumber.js');
const getPrivateKey = require('../src/utils/read-private-key-json');

const { createProfile } = sonmApi;

const URL_REMOTE_GETH_NODE  = 'https://rinkeby.infura.io';

let VASYA, PETYA;

before(async function() {
  this.timeout(+Infinity);

  const vasyaCfg = require('./data/Vasya_11111111.json');
  const petyaCfg = require('./data/Petya_qazwsxedc.json');

  console.log('Recover private keys...');
  const [vasyaPrivateKey, petyaPrivateKey] = await Promise.all([
    getPrivateKey(vasyaCfg, '11111111'),
    getPrivateKey(petyaCfg, 'qazwsxedc'),
  ]);
  console.log('done');

  console.log('Creating test profiles...');
  VASYA = await createProfile(URL_REMOTE_GETH_NODE, vasyaCfg.address, vasyaPrivateKey.toString('hex'), { limitGasPrice: new BN('30000000000') });
  PETYA = await createProfile(URL_REMOTE_GETH_NODE, petyaCfg.address, petyaPrivateKey.toString('hex'), { limitGasPrice: new BN('30000000000') });
  console.log('done');

  const gasPrice = await VASYA.getGasPrice();
  console.log('Gas price: ', gasPrice.toFormat());
});

describe('Profile entity', function() {
  describe('ether', function() {
    it('should send ether from VASYA to PETYA', async function() {
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

      const [ newVasyaBalance, newPetyaBalance] = await Promise.all([
        VASYA.getBalance(),
        PETYA.getBalance(),
      ]);

      expect('' + newVasyaBalance).equal('' + new BN(vasyaBalance).minus(qty).minus(txPrice));
      expect('' + newPetyaBalance).equal('' + new BN(petyaBalance).plus(qty));
    });
  });

  describe('tokens', function() {
    it('should send sonm tokens from VASYA to PETYA', async function() {
      this.timeout(+Infinity);

      const qty = 2;

      const [ vasyaBalance, petyaBalance] = await Promise.all([
        VASYA.getTokenBalance(),
        PETYA.getTokenBalance(),
      ]);

      console.log(`sonm balance Vasya: ${vasyaBalance.toString()} Petya: ${petyaBalance.toString()}`);

      const txResult = await VASYA.sendTokens(PETYA, qty);

      console.log(`transaction hash ${await txResult.getHash()}`);

      const receipt = await txResult.getReceipt();

      expect('' + await VASYA.getTokenBalance()).equal('' + new BN(vasyaBalance).minus(qty));
      expect('' + await PETYA.getTokenBalance()).equal('' + new BN(petyaBalance).plus(qty));
    });
  });
});
