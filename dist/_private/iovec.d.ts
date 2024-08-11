import type { InstantiatedWasi } from "../instantiated-wasi.js";
export interface Iovec {
    bufferStart: number;
    bufferLength: number;
}
export declare function parse(info: InstantiatedWasi<{}>, ptr: number): Iovec;
export declare function parseArray(info: InstantiatedWasi<{}>, ptr: number, count: number): Generator<Iovec, void, void>;
//# sourceMappingURL=iovec.d.ts.map