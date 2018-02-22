'use strict';

const invariant = require('fbjs/lib/invariant');
const initContract = require('../utils/init-contract');
const add0x = require('../utils/add-0x');

class Profile {
    constructor({gethClient}) {
        invariant(gethClient, 'gethClient is not defined');
        this.gethClient = gethClient;
    }

    async init(address) {
        this.contract = await initContract('profile', this.gethClient, address);
    }

    async resolveAddress(address) {
        const response = [];
        const indexes = await this.contract.call('GetAllIndexes', [add0x(address)]);

        for(const index of indexes) {
            console.log(index);

            const item = await this.contract.call('GetRecordByIndex', [index]);
            response.push(item);
        }

        return response;
    }
}

module.exports = Profile;
