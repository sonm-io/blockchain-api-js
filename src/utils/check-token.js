'use strict';

const invariant = require('fbjs/lib/invariant');
const initContract = require('./init-contract');

module.exports = async function isERC20(address, gethClient) {
    invariant(address, 'address is not defined');
    invariant(address.startsWith('0x'), 'address should starts with 0x');
    invariant(gethClient, 'gethClient is not defined');

    try {
        if (await gethClient.method('getCode')(address) !== '0x') {
            const contractObject = await initContract('token', gethClient);
            const contract = await contractObject.at(address);

            const [name, symbol, decimals] = await Promise.all([
                contract.name(),
                contract.symbol(),
                contract.decimals()
            ]);

            return {
                name,
                symbol,
                decimals,
                address,
                contract: contract
            };
        } else {
            return false;
        }
    } catch (err) {
        return false;
    }
};