import { InstantiatedWasm } from "../wasm.js";

export function readUint32(instance: InstantiatedWasm, ptr: number): number { return instance.cachedMemoryView.getUint32(ptr, true); }
