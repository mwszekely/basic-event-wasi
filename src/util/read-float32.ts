import { InstantiatedWasm } from "../wasm.js";

export function readFloat32(instance: InstantiatedWasm, ptr: number): number { return instance.cachedMemoryView.getFloat32(ptr, true); }
