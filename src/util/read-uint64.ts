import type { Pointer } from "../types.js";
import { InstantiatedWasm } from "../wasm.js";

export function readUint64(instance: InstantiatedWasm, ptr: Pointer<number>): bigint { return instance.cachedMemoryView.getBigUint64(ptr, true); }
