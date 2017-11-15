const {expect} = require('chai');
const sonmApi = require('../index');
const BN = require('bignumber.js');
const getPrivateKey = require('../src/utils/recover-private-key');
const isERC20 = require('../src/utils/check-token');

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

    const {createClient, createVotes} = sonmApi;

    const vasyaGethClient = createClient(URL_REMOTE_GETH_NODE, vasyaCfg.address, {limitGasPrice: new BN('30000000000')});
    const petyaGethClient = createClient(URL_REMOTE_GETH_NODE, petyaCfg.address, {limitGasPrice: new BN('30000000000')});

    console.log('Creating test accounts...');
    VASYA = await vasyaGethClient.createAccount();
    PETYA = await petyaGethClient.createAccount();
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

    const gasPrice = await VASYA.getGasPrice();
    console.log('Gas price: ', gasPrice.toFormat());

    VOTE = await createVotes(VASYA);
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

            const txResult = await VASYA.sendTokens(PETYA, qty);

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
            const balances = await VASYA.getBalances();
            expect(balances).to.have.all.keys('eth', 'snmt');
        });

        it('should check smartContract on address', async function () {
            expect(await isERC20(VASYA.tokens.snmt.contract.address, VASYA.geth)).to.be.an('object');
            expect(await isERC20(VASYA.getAddress(), VASYA.geth)).equal(false);
        });
    });
});

describe('Votes entity', function () {
    this.timeout(120000);

    it('should get votes list', async function () {
        expect(await VOTE.getList()).to.be.an('array');
    });

    it('should get vote info', async function () {
        const list = await VOTE.getList();

        VOTE.setCurrent(list[0].address);
        expect(await VOTE.getVoteInfo()).to.be.an('object')
    });

    it('should vote for option 1', async function () {
        const list = await VOTE.getList();

        VOTE.setCurrent(list[0].address);
        const infoBefore = await VOTE.getVoteFullInfo();
        const balanceBefore = await VOTE.getVoteBalance();
        const balanceOptionsBefore = await VOTE.getVoteBalanceForOptions();

        // console.log(infoBefore);
        // console.log(balanceBefore);
        // console.log(balanceOptionsBefore);

        //try to vote
        const option = infoBefore.options[1].index;
        const qty = 2;
        console.log(`Try to vote for option ${option} by ${qty} tokens....`);

        await VOTE.vote(option, qty);

        const infoAfter = await VOTE.getVoteFullInfo();
        const balanceAfter = await VOTE.getVoteBalance();
        const balanceOptionsAfter = await VOTE.getVoteBalanceForOptions();

        // console.log(infoAfter);
        // console.log(balanceAfter);
        // console.log(balanceOptionsAfter);

        expect(infoBefore.options[option].votes).equal(infoAfter.options[option].votes - 1);
        expect(infoBefore.options[option].weight).equal(infoAfter.options[option].weight - qty);
        expect(balanceBefore).equal(balanceAfter - qty);
        expect(balanceOptionsBefore[option]).equal(balanceOptionsAfter[option] - qty);
    });
});