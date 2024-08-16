import { InstantiatedWasm } from "../wasm.js";

export function writeUint16(instance: InstantiatedWasm, ptr: number, value: number): void { return instance.cachedMemoryView.setUint16(ptr, value, true); }
