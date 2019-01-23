import { Contract } from "../contract";

export class WrapperBase {
    /**
     * @param {Contract} contract 
     */
    constructor (contract) {
        this.contract = contract;
    }
}