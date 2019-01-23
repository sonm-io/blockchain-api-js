/**
 * Add 0x prefix
 * @param {string} str value
 */
export const add0x = (str) => {
    if (typeof str === 'string' && !str.startsWith('0x')) {
        return '0x' + str;
    }

    return str;
};
