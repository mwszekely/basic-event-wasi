import { PrivateImpl } from "../types.js";
export interface Iovec {
    bufferStart: number;
    bufferLength: number;
}
export declare function parse(info: PrivateImpl, ptr: number): Iovec;
export declare function parseArray(info: PrivateImpl, ptr: number, count: number): Generator<Iovec, void, unknown>;
