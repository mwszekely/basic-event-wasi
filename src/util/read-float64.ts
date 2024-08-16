import { InstantiatedWasm } from "../wasm.js";


export function readFloat64(instance: InstantiatedWasm, ptr: number): number { return instance.cachedMemoryView.getFloat64(ptr, true); }
