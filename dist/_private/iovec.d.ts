import type { InstantiatedWasm } from "../wasm.js";
export interface Iovec {
    bufferStart: number;
    bufferLength: number;
    uint8: Uint8Array;
}
export declare function parse(info: InstantiatedWasm, ptr: number): Iovec;
export declare function parseArray(info: InstantiatedWasm, ptr: number, count: number): Iovec[];
//# sourceMappingURL=iovec.d.ts.map