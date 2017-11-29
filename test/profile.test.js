const {expect} = require('chai');
const sonmApi = require('../index');
const BN = require('bignumber.js');
const getPrivateKey = require('../src/utils/recover-private-key');
const isERC20 = require('../src/utils/check-token');

const URL_REMOTE_GETH_NODE = 'https://rinkeby.infura.io';

let VASYA, PETYA;

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

    const {  createSonmFactory } = sonmApi;

    const vasyaGethClient = createSonmFactory(URL_REMOTE_GETH_NODE, {limitGasPrice: new BN('30000000000')});
    const petyaGethClient = createSonmFactory(URL_REMOTE_GETH_NODE, {limitGasPrice: new BN('30000000000')});

    console.log('Creating test accounts...');
    VASYA = await vasyaGethClient.createAccount(vasyaCfg.address);
    PETYA = await petyaGethClient.createAccount(petyaCfg.address);
    console.log('done');

    console.log('Get balances without privateKeys...');
    const [vasyaBalance, petyaBalance] = await Promise.all([
        VASYA.getBalance(),
        PETYA.getBalance(),
    ]);

    console.log(`Ether balance Vasya: ${vasyaBalance} Petya: ${petyaBalance}`);

    console.log('Set private keys....');
    vasyaGethClient.setPrivateKey(vasyaPrivateKey.toString('hex'));
    petyaGethClient.setPrivateKey(petyaPrivateKey.toString('hex'));

    const gasPrice = await vasyaGethClient.getGasPrice();
    console.log('Gas price: ', gasPrice.toFormat());
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
            
            const txResult = await VASYA.sendEther(PETYA, qty, 500000);

            console.log(`transaction hash ${await txResult.getHash()}`);

            //const receipt = await txResult.getReceipt();

            console.log('confirmations', await txResult.getConfirmationsCount());

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

            const txResult = await VASYA.sendTokens(PETYA.getAddress(), qty, null, 500001);

            console.log(`transaction hash ${await txResult.getHash()}`);

            const receipt = await txResult.getReceipt();
            //console.log(receipt);

            expect('' + await VASYA.getTokenBalance()).equal('' + new BN(vasyaBalance).minus(qty));
            expect('' + await PETYA.getTokenBalance()).equal('' + new BN(petyaBalance).plus(qty));
        });
    });

    describe('utils', function () {
        this.timeout(10000);

        it('should get balances for eth and snmt', async function () {
            expect(Object.keys(VASYA.tokens).length).equal(1);

            const balances = await VASYA.getCurrencyBalances();

            expect(balances).to.have.all.keys('0x', Object.keys(VASYA.tokens)[0]);
        });

        it('should check smartContract on address', async function () {
            expect(await isERC20(Object.keys(VASYA.tokens)[0], VASYA.geth)).to.be.an('object');
            expect(await isERC20(VASYA.getAddress(), VASYA.geth)).equal(false);
        });
    });
});