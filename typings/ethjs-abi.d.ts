declare module 'ethjs-abi' {
    function encodeMethod (method: object, values: any[]): string;
    function decodeMethod (method: object, data: string): any;
}