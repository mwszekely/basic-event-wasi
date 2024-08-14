import type { Pointer } from "../types.js";
import { InstantiatedWasm } from "../wasm.js";

export function writeInt64(instance: InstantiatedWasm, ptr: Pointer<number>, value: bigint): void { return instance.cachedMemoryView.setBigInt64(ptr, value, true); }
