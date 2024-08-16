import { InstantiatedWasm } from "../wasm.js";
/**
 * Same as `writeUint32`, but typed for pointers, and future-proofs against 64-bit architectures.
 *
 * This is *not* the same as dereferencing a pointer. This is about writing a pointer's numerical value to a specified address in memory.
 */
export declare function writePointer(instance: InstantiatedWasm, ptr: number, value: number): void;
//# sourceMappingURL=write-pointer.d.ts.map