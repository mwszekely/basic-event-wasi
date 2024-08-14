import type { Pointer } from "../types.js";
import { InstantiatedWasm } from "../wasm.js";

export function readFloat32(instance: InstantiatedWasm, ptr: Pointer<number>): number { return instance.cachedMemoryView.getFloat32(ptr, true); }
