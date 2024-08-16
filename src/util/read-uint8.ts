import { InstantiatedWasm } from "../wasm.js";

export function readUint8(instance: InstantiatedWasm, ptr: number): number { return instance.cachedMemoryView.getUint8(ptr); }
