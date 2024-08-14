import type { Pointer } from "../types.js";
import { InstantiatedWasm } from "../wasm.js";

export function writeUint64(instance: InstantiatedWasm, ptr: Pointer<number>, value: bigint): void { return instance.cachedMemoryView.setBigUint64(ptr, value, true); }
