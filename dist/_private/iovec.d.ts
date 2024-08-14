import type { InstantiatedWasm } from "../wasm.js";
export interface Iovec {
    bufferStart: number;
    bufferLength: number;
}
export declare function parse(info: InstantiatedWasm, ptr: number): Iovec;
export declare function parseArray(info: InstantiatedWasm, ptr: number, count: number): Generator<Iovec, void, void>;
//# sourceMappingURL=iovec.d.ts.map