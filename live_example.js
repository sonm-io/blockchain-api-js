const sonmApi = require('./index');
const { createSonmFactory } = sonmApi;
const URL_REMOTE_GETH_NODE = 'https://mainnet.infura.io';

const main = async function() {
    const client = createSonmFactory(URL_REMOTE_GETH_NODE);
    const account = await client.createAccount('0xb14eaf5969c32eb379451b4454d438e5ec51627a');

    console.log(await account.getCurrencyBalances());
};

main();