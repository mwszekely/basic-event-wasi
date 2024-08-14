import type { Pointer } from "../types.js";
import { InstantiatedWasm } from "../wasm.js";

export function readUint32(instance: InstantiatedWasm, ptr: Pointer<number>): number { return instance.cachedMemoryView.getUint32(ptr, true); }
