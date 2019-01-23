import { WrapperBase } from "./wrapper-base";

export class OracleUsd extends WrapperBase {

    async getCurrentPrice () {
        return (await this.contract.call('getCurrentPrice')).toString(); 
    }
}