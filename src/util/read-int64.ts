import { InstantiatedWasm } from "../wasm.js";

export function readInt64(instance: InstantiatedWasm, ptr: number): bigint { return instance.cachedMemoryView.getBigInt64(ptr, true); }
