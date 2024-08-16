import { InstantiatedWasm } from "../wasm.js";
import { setPointer } from "./pointer.js";

/**
 * Same as `writeUint32`, but typed for pointers, and future-proofs against 64-bit architectures.
 * 
 * This is *not* the same as dereferencing a pointer. This is about writing a pointer's numerical value to a specified address in memory.
 */
export function writePointer(instance: InstantiatedWasm, ptr: number, value: number): void { instance.cachedMemoryView[setPointer](ptr, value as never, true); }
