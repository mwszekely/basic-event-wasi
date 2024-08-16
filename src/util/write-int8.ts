import { InstantiatedWasm } from "../wasm.js";

export function writeInt8(instance: InstantiatedWasm, ptr: number, value: number): void { return instance.cachedMemoryView.setInt8(ptr, value); }
