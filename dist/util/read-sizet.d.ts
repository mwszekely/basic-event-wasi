import { InstantiatedWasi } from "../instantiated-wasi.js";
import type { Pointer } from "../types.js";
/**
 * Same as `readUint32`, but typed for size_t values, and future-proofs against 64-bit architectures.
 */
export declare function readSizeT(instance: InstantiatedWasi<{}>, ptr: Pointer<number>): number;
//# sourceMappingURL=read-sizet.d.ts.map