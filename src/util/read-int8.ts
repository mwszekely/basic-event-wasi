import type { Pointer } from "../types.js";
import { InstantiatedWasm } from "../wasm.js";

export function readInt8(instance: InstantiatedWasm, ptr: Pointer<number>): number { return instance.cachedMemoryView.getInt8(ptr); }
