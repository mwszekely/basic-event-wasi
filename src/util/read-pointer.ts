import { InstantiatedWasm } from "../wasm.js";
import { getPointer } from "./pointer.js";


/**
 * Same as `readUint32`, but typed for pointers, and future-proofs against 64-bit architectures.
 * 
 * This is *not* the same as dereferencing a pointer. This is about reading the numerical value at a given address that is, itself, to be interpreted as a pointer.
 */
export function readPointer(instance: InstantiatedWasm, ptr: number): number { return instance.cachedMemoryView[getPointer](ptr, true) as number; }
