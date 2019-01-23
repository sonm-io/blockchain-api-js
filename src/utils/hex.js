const BN = require ('bn.js'); 

/**
 * @param {string} val value
 * @returns {string}
 */
export const fromHex = (val) => {
    if (val.substr(0,2) === '0x') {
        val = val.substr(2);
    }

    return new BN(val, 16).toString(10);
};

/**
 * @param {string|number} val 
 * @returns {string}
 */
export const toHex = (val) => {
    return typeof val === 'string' && val.startsWith('0x')
        ? val
        : '0x' + new BN(val).toString(16);
};