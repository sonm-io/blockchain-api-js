const BN = require('ethereumjs-util').BN;
const fromHex = require('./utils/from-hex');

const MINUTE = 60 * 1000;
const MAX_TIMEOUT = MINUTE * 1000;

class TxResult {
    constructor(src, gethClient, txParams = null) {
        this._geth = gethClient;
        this._receipt = null;
        this._hash = null;
        this._promise = null;

        if (txParams !== null) {
            this.validateTxParams(txParams);
        }
        this._txParams = txParams;

        if (src instanceof TxResult) {
            this._copyCtr(src);
        } else if (src instanceof Promise) {
            this._promise = src.then(result => this._processPromiseResult(result));
        } else if (TxResult.checkTxHash(src)) {
            this._hash = src;
        } else {
            throw new Error('Unknown transaction src');
        }
    }

    _copyCtr(txResult) {
        if (txResult._hash) {
            this._hash = txResult._hash;
        } else {
            this._promise = txResult._promise.then(result => this._processPromiseResult(result));
        }
    }

    _processPromiseResult(val) {
        if (TxResult.checkTxHash(val)) {
            this._hash = val;
        } else if (val && TxResult.checkTxReceipt(val.receipt)) {
            this._receipt = val.receipt;
            this._hash = val.receipt.transactionHash;
        }
    }

    static checkTxHash(src) {
        return typeof src === 'string' && src.startsWith('0x');
    }

    static checkTxReceipt(src) {
        return src instanceof Object
            && 'cumulativeGasUsed' in src;
    }

    async getHash() {
        await this._promise;

        return this._hash;
    }

    async getTransaction() {
        if (this._txParams === null) {
            this._txParams = await this._geth.getTransaction(await this.getHash());
            this.validateTxParams(this._txParams);
        }

        return this._txParams;
    }

    validateTxParams(txParams) {
        const valid = typeof txParams === 'object'
            && 'gasPrice' in txParams;

        if (!valid) {
            throw new Error('incorrect txParams');
        }
    }

    async getTxPrice() {
        const receipt = await this.getReceipt();
        const transaction = await this.getTransaction();

        return transaction.gasPrice ? new BN(fromHex(transaction.gasPrice)).mul(new BN(fromHex(receipt.gasUsed))).toString() : '0';
    }

    async getConfirmationsCount() {
        const [receipt, currentBlockNumber] = await Promise.all([
            this.getReceipt(),
            this._geth.getBlockNumber(),
        ]);

        return (currentBlockNumber > receipt.blockNumber) ? currentBlockNumber - receipt.blockNumber : 0;
    }

    async getReceipt() {
        let result;

        await this._promise;

        if (!this._receipt) {
            const hash = await this.getHash();
            const promise = new Promise((done, reject) => {
                const timeoutTask = setTimeout(() => reject(`getReceipt timeout: ${MAX_TIMEOUT}`), MAX_TIMEOUT);

                const check = async () => {
                    const result = await this._geth.getTransactionReceipt(hash);

                    if (result) {
                        clearTimeout(timeoutTask);
                        done(result);
                    } else {
                        setTimeout(check, this._getPollingInterval());
                    }
                };

                check();
            });

            await promise.then(receipt => this._receipt = receipt);
        }

        result = this._receipt;

        return result;
    }

    _getPollingInterval() {
        const age = Date.now() - this.timestamp;

        const result = age > MINUTE
            ? MINUTE
            : 1000;

        return result;
    }

    async getInfo() {
        return this._geth.method('getTransaction')(await this.getHash());
    }
}

module.exports = TxResult;

