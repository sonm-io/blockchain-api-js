const {expect} = require('chai');
const sonmApi = require('../index');
const BN = require('ethereumjs-util').BN;
const getPrivateKey = require('../src/utils/recover-private-key');
const newAccount = require('../src/utils/new-account');
const isERC20 = require('../src/utils/check-token');
const randomBytes = require('randombytes');

const URL_REMOTE_GETH_NODE = 'https://rinkeby.infura.io';
const URL_PRIVATE_CHAIN = 'http://159.65.167.139:8545';

let VASYA, PETYA, tokenList, sonmTokenAddress, sideChainSonmToken, sonmToken;

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
    const vasyaSidechainClient = createSonmFactory(URL_PRIVATE_CHAIN, 'private');

    console.log('Creating test accounts...');
    VASYA = await vasyaClient.createAccount(vasyaCfg.address);
    PETYA = await petyaClient.createAccount(petyaCfg.address);
    sidechainVASYA = await vasyaSidechainClient.createAccount(vasyaCfg.address);
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
    vasyaSidechainClient.setPrivateKey(vasyaPrivateKey);

    console.log('Request test tokens....');
    await VASYA.requestTestTokens();
    //await PETYA.requestTestTokens();

    const gasPrice = await vasyaClient.gethClient.getGasPrice();
    console.log('Gas price: ', gasPrice);

    sonmTokenAddress = vasyaClient.getSonmTokenAddress();
    console.log('Sonm token address: ', sonmTokenAddress);

    console.log('Init token lists...');
    tokenList = await vasyaClient.createTokenList();
    console.log('done');

    console.log('Init sidechain token lists...');
    sidechainTokenList = await vasyaSidechainClient.createTokenList();
    console.log('done');

    sideChainSonmToken = sidechainTokenList.getToken(vasyaSidechainClient.getSonmTokenAddress());
    sonmToken = tokenList.getToken(sonmTokenAddress);
});

describe('SONM entity', function () {
    describe('utils', function () {
        this.timeout(30000);

        it('should get balances for eth and snmt', async function () {
            expect(tokenList.getList().length).equal(2);

            const balances = await tokenList.getBalances(VASYA.getAddress());
            expect(balances).to.have.all.keys('0x', sonmTokenAddress);
        });

        it('should check smartContract on address', async function () {
            expect(await isERC20(sonmTokenAddress, VASYA.gethClient)).to.be.an('object');

            try {
                await isERC20(VASYA.getAddress(), VASYA.gethClient);
            } catch (err) {
                expect(err).to.be.an('error');
            }
        });

        it('should get tokenInfo with balance', async function () {
            const tokenInfo = await tokenList.getTokenInfo(sonmTokenAddress, vasyaCfg.address);
            expect(tokenInfo).to.have.property('name');
            expect(tokenInfo).to.have.property('balance');
            expect(tokenInfo.balance.length).not.equal(1);
        });

        it('should add and remove Token', async function () {
            const tokenAddress = '0x225b929916daadd5044d5934936313001f55d8f0';

            await tokenList.add(tokenAddress);
            expect(tokenList.getList().length).equal(3);

            await tokenList.remove(tokenAddress);
            expect(tokenList.getList().length).equal(2);
        });

        it('should generate new account and recover private key from it', async function () {
            const password = new Buffer(randomBytes(10), 'hex');
            const json = newAccount(password);
            const privateKey = getPrivateKey(json, password);

            expect(privateKey).to.be.an('string');

            //generate from private key
            const json1 = newAccount(password, '0x' + privateKey);
            const privateKeyFromAccount = getPrivateKey(json1, password);

            expect(privateKeyFromAccount).equal(privateKey);
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

            const txResult = await VASYA.sendEther(PETYA, qty, 1000000, 200000000000);
            console.log(`transaction hash ${await txResult.getHash()}`);

            const receipt = await txResult.getReceipt();
            console.log('confirmations', await txResult.getConfirmationsCount());

            const txPrice = await txResult.getTxPrice();

            const [newVasyaBalance, newPetyaBalance] = await Promise.all([
                VASYA.getBalance(),
                PETYA.getBalance(),
            ]);

            expect(newVasyaBalance.toString()).equal(new BN(vasyaBalance).sub(new BN(qty)).sub(new BN(txPrice)).toString());
            expect(newPetyaBalance.toString()).equal(new BN(petyaBalance).add(new BN(qty)).toString());
        });
    });

    describe('tokens', function () {
        it('should send sonm tokens from VASYA to PETYA', async function () {
            this.timeout(+Infinity);


            const qty = 2;

            const [vasyaBalance, petyaBalance] = await Promise.all([
                sonmToken.getBalance(VASYA.getAddress()),
                sonmToken.getBalance(PETYA.getAddress()),
            ]);

            console.log(`sonm balance Vasya: ${vasyaBalance.toString()} Petya: ${petyaBalance.toString()}`);

            const txResult = await VASYA.sendTokens(PETYA.getAddress(), qty, sonmTokenAddress, 1000001, 200000000000);

            console.log(`transaction hash ${await txResult.getHash()}`);

            await txResult.getReceipt();

            expect(await sonmToken.getBalance(VASYA.getAddress())).equal(new BN(vasyaBalance).sub(new BN(qty)).toString());
            expect(await sonmToken.getBalance(PETYA.getAddress())).equal(new BN(petyaBalance).add(new BN(qty)).toString());
        });
    });

    /*
    describe('deposit && withdraw', function () {
        it('should deposit VASYA', async function () {
            this.timeout(+Infinity);
            console.log(await sidechainVASYA.getTokenExchangeRate());

            const [vasyaSidechainBalance] = await Promise.all([
                sideChainSonmToken.getBalance(VASYA.getAddress()),
            ]);

            console.log(vasyaSidechainBalance);

            // const amount = 10;
            // const txResult = await VASYA.migrateToken(amount, 1000000, 200000000000);
            // console.log(await txResult.getHash());
            //
            // if (txResult) {
            //     await txResult.getReceipt();
            //
            //     const [vasyaSidechainBalance] = await Promise.all([
            //         sideChainSonmToken.getBalance(VASYA.getAddress()),
            //     ]);
            //
            //     console.log(vasyaSidechainBalance);
            //
            //     expect(true).equal(true);
            // }
        });

        // it('should withdraw VASYA', async function () {
        //     this.timeout(+Infinity);
        //
        //     const [vasyaSidechainBalance] = await Promise.all([
        //         sideChainSonmToken.getBalance(VASYA.getAddress()),
        //     ]);
        //
        //     console.log(vasyaSidechainBalance);
        //
        //     const amount = 10;
        //     const txResult = await sidechainVASYA.migrateToken(amount, 100000, 200000000000);
        //
        //     if (txResult) {
        //         await txResult.getReceipt();
        //         console.log(await txResult.getTxPrice());
        //
        //         expect(true).equal(true);
        //     }
        // });
    });
    */

});
