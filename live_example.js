const sonmApi = require('./index');
const { createSonmFactory } = sonmApi;
const URL_REMOTE_GETH_NODE = 'https://mainnet.infura.io';

const main = async function() {
    const client = createSonmFactory(URL_REMOTE_GETH_NODE);
    const account = await client.createAccount('0x7E5F4552091A69125d5DfCb7b8C2659029395Bdf');

    console.log(await account.getCurrencyBalances());
};

main();