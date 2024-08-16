import { InstantiatedWasm } from "../wasm.js";

export function writeFloat32(instance: InstantiatedWasm, ptr: number, value: number): void { return instance.cachedMemoryView.setFloat32(ptr, value, true); }
