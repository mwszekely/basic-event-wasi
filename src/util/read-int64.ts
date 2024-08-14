import type { Pointer } from "../types.js";
import { InstantiatedWasm } from "../wasm.js";

export function readInt64(instance: InstantiatedWasm, ptr: Pointer<number>): bigint { return instance.cachedMemoryView.getBigInt64(ptr, true); }
