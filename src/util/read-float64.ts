import type { Pointer } from "../types.js";
import { InstantiatedWasm } from "../wasm.js";


export function readFloat64(instance: InstantiatedWasm, ptr: Pointer<number>): number { return instance.cachedMemoryView.getFloat64(ptr, true); }
