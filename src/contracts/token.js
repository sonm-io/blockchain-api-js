import { add0x } from "../utils/add-0x";
import { WrapperBase } from "./wrapper-base";

export class Token extends WrapperBase {
    
    /**
     * @param {string} address 
     */
    async balanceOf (address) {
        return (await this.contract.call('balanceOf', [add0x(address)])).toString(); 
    }
}
