import { InstantiatedWasm } from "../wasm.js";


export function writeFloat64(instance: InstantiatedWasm, ptr: number, value: number): void { return instance.cachedMemoryView.setFloat64(ptr, value, true); }
