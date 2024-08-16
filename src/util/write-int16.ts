import { InstantiatedWasm } from "../wasm.js";

export function writeInt16(instance: InstantiatedWasm, ptr: number, value: number): void { return instance.cachedMemoryView.setInt16(ptr, value, true); }
