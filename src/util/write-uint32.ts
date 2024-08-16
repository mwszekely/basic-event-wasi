import { InstantiatedWasm } from "../wasm.js";

export function writeUint32(instance: InstantiatedWasm, ptr: number, value: number): void { return instance.cachedMemoryView.setUint32(ptr, value, true); }
