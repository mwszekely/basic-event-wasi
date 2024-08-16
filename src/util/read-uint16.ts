import { InstantiatedWasm } from "../wasm.js";

export function readUint16(instance: InstantiatedWasm, ptr: number): number { return instance.cachedMemoryView.getUint16(ptr, true); }
