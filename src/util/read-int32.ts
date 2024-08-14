import type { Pointer } from "../types.js";
import { InstantiatedWasm } from "../wasm.js";

export function readInt32(instance: InstantiatedWasm, ptr: Pointer<number>): number { return instance.cachedMemoryView.getInt32(ptr, true); }
