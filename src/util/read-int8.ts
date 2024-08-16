import { InstantiatedWasm } from "../wasm.js";

export function readInt8(instance: InstantiatedWasm, ptr: number): number { return instance.cachedMemoryView.getInt8(ptr); }
