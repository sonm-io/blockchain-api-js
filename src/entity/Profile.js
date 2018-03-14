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
        const info = {};
        const indexes = await this.contract.call('GetAllIndexes', [add0x(address)]);

        for(const index of indexes) {
            const item = await this.contract.call('GetRecordByIndex', [index]);
            const [name, value] = item[1].split(':');

            info[name] = value;
        }

        return info;
    }
}

module.exports = Profile;
