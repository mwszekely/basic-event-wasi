import { InstantiatedWasm } from "../wasm.js";
/**
 * Same as `readUint32`, but typed for size_t values, and future-proofs against 64-bit architectures.
 */
export declare function readSizeT(instance: InstantiatedWasm, ptr: number): number;
//# sourceMappingURL=read-sizet.d.ts.map