import type { Pointer } from "../types.js";
import { InstantiatedWasm } from "../wasm.js";
import { getSizeT } from "./sizet.js";


/**
 * Same as `readUint32`, but typed for size_t values, and future-proofs against 64-bit architectures.
 */
export function readSizeT(instance: InstantiatedWasm, ptr: Pointer<number>): number { return instance.cachedMemoryView[getSizeT](ptr, true) as number; }
