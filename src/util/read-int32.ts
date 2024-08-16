import { InstantiatedWasm } from "../wasm.js";

export function readInt32(instance: InstantiatedWasm, ptr: number): number { return instance.cachedMemoryView.getInt32(ptr, true); }
