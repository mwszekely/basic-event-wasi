import type { Pointer } from "../types.js";
import { InstantiatedWasm } from "../wasm.js";

export function readUint16(instance: InstantiatedWasm, ptr: Pointer<number>): number { return instance.cachedMemoryView.getUint16(ptr, true); }
