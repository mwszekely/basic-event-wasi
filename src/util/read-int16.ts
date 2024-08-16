import { InstantiatedWasm } from "../wasm.js";

export function readInt16(instance: InstantiatedWasm, ptr: number): number { return instance.cachedMemoryView.getInt16(ptr, true); }
