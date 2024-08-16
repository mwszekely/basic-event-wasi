import { InstantiatedWasm } from "../wasm.js";
/**
 * Same as `readUint32`, but typed for pointers, and future-proofs against 64-bit architectures.
 *
 * This is *not* the same as dereferencing a pointer. This is about reading the numerical value at a given address that is, itself, to be interpreted as a pointer.
 */
export declare function readPointer(instance: InstantiatedWasm, ptr: number): number;
//# sourceMappingURL=read-pointer.d.ts.map