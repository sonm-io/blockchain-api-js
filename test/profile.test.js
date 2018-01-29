const {expect} = require('chai');
const sonmApi = require('../index');
const BN = require('bignumber.js');
const getPrivateKey = require('../src/utils/recover-private-key');
const newAccount = require('../src/utils/new-account');
const isERC20 = require('../src/utils/check-token');
const crypto = require('crypto-browserify');
const { fromWei, toWei, toBigNumber } = require('../src/utils/format-ether');

const URL_REMOTE_GETH_NODE = 'https://rinkeby.infura.io';

let VASYA, PETYA, TokenList, sonmTokenAddress;

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

    const { createSonmFactory } = sonmApi;

    const vasyaClient = createSonmFactory(URL_REMOTE_GETH_NODE, 'rinkeby');
    const petyaClient = createSonmFactory(URL_REMOTE_GETH_NODE, 'rinkeby');

    console.log('Creating test accounts...');
    VASYA = await vasyaClient.createAccount(vasyaCfg.address);
    PETYA = await petyaClient.createAccount(petyaCfg.address);
    console.log('done');

    console.log('Get balances without privateKeys...');
    const [vasyaBalance, petyaBalance] = await Promise.all([
        VASYA.getBalance(),
        PETYA.getBalance(),
    ]);

    console.log(`Ether balance Vasya: ${vasyaBalance} Petya: ${petyaBalance}`);

    console.log('Set private keys....');
    vasyaClient.setPrivateKey(vasyaPrivateKey);
    petyaClient.setPrivateKey(petyaPrivateKey);

    // // console.log('Request test tokens....');
    // // await VASYA.requestTestTokens();
    // // await PETYA.requestTestTokens();

    const gasPrice = await vasyaClient.gethClient.getGasPrice();
    console.log('Gas price: ', gasPrice);

    sonmTokenAddress = vasyaClient.getSonmTokenAddress();
    console.log('Sonm token address: ', sonmTokenAddress);

    console.log('Init token lists...');
    TokenList = await vasyaClient.createTokenList();
    console.log('done');
});

describe('Profile entity', function () {
    describe('utils', function () {
        this.timeout(30000);

        it('should get balances for eth and snmt', async function () {
            expect(TokenList.getList().length).equal(2);

            const balances = await TokenList.getBalances(VASYA.getAddress());

            expect(balances).to.have.all.keys('0x', sonmTokenAddress);
        });

        it('should check smartContract on address', async function () {
            expect(await isERC20(sonmTokenAddress, VASYA.gethClient)).to.be.an('object');
            expect(await isERC20(VASYA.getAddress(), VASYA.gethClient)).equal(false);
        });

        it('should generate new account and recover private key from it', async function () {
            const password = new Buffer(crypto.randomBytes(10), 'hex');
            const json = newAccount(password);
            const privateKey = getPrivateKey(json, password);

            expect(privateKey).to.be.an('string');
        });

        it('should format ether', async function () {
            const wei = '6760490415160604968';
            const ether = '6.760490415160604968';

            expect(toWei(ether, 'ether')).equal(wei);
            expect(fromWei(wei, 'ether')).equal(ether);
        });
    });

    describe('ether', function () {
        it('should send ether from VASYA to PETYA', async function () {
            this.timeout(+Infinity);

            const qty = '1';

            const [vasyaBalance, petyaBalance] = await Promise.all([
                VASYA.getBalance(),
                PETYA.getBalance(),
            ]);

            console.log(`ether balance Vasya: ${vasyaBalance} Petya: ${petyaBalance}`);

            const txResult = await VASYA.sendEther(PETYA, qty, 1000000, 100000000000);
            console.log(`transaction hash ${await txResult.getHash()}`);

            const receipt = await txResult.getReceipt();
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

            const sonmToken = TokenList.getToken(sonmTokenAddress);
            const qty = 2;

            const [vasyaBalance, petyaBalance] = await Promise.all([
                sonmToken.getBalance(VASYA.getAddress()),
                sonmToken.getBalance(PETYA.getAddress()),
            ]);

            console.log(`sonm balance Vasya: ${vasyaBalance.toString()} Petya: ${petyaBalance.toString()}`);

            const txResult = await VASYA.sendTokens(PETYA.getAddress(), qty, sonmTokenAddress, 1000001, 100000000000);

            console.log(`transaction hash ${await txResult.getHash()}`);

            const receipt = await txResult.getReceipt();

            expect('' + await sonmToken.getBalance(VASYA.getAddress())).equal('' + new BN(vasyaBalance).minus(qty));
            expect('' + await sonmToken.getBalance(PETYA.getAddress())).equal('' + new BN(petyaBalance).plus(qty));
        });
    });
});