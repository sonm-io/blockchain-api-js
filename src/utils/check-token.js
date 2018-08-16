'use strict';

const invariant = require('fbjs/lib/invariant');
const initContract = require('./init-contract');

module.exports = async function isERC20(address, gethClient) {
    invariant(address, 'address is not defined');
    invariant(address.startsWith('0x'), 'address should starts with 0x');
    invariant(gethClient, 'gethClient is not defined');

    if (await gethClient.getCode(address) !== '0x') {
        try {
            const contract = initContract('token', gethClient, address);

            const [name, symbol, decimals] = await Promise.all([
                contract.call('name'),
                contract.call('symbol'),
                contract.call('decimals'),
            ]);

            return {
                name,
                symbol,
                decimals: decimals.toNumber(),
                address,
                contract,
            };
        } catch (err) {
            console.log(err);
            throw new Error('not_erc20_token');
        }
    } else {
        throw new Error('not_smart_contract');
    }
};
