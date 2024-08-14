import type { Pointer } from "../types.js";
import { InstantiatedWasm } from "../wasm.js";

export function readInt16(instance: InstantiatedWasm, ptr: Pointer<number>): number { return instance.cachedMemoryView.getInt16(ptr, true); }
