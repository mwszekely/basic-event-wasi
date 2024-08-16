import { InstantiatedWasm } from "../wasm.js";

export function readUint64(instance: InstantiatedWasm, ptr: number): bigint { return instance.cachedMemoryView.getBigUint64(ptr, true); }
