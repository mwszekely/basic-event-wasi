import type { Pointer } from "../types.js";
import { InstantiatedWasm } from "../wasm.js";

export function readUint8(instance: InstantiatedWasm, ptr: Pointer<number>): number { return instance.cachedMemoryView.getUint8(ptr); }
