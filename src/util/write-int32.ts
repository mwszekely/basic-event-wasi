import type { Pointer } from "../types.js";
import { InstantiatedWasm } from "../wasm.js";

export function writeInt32(instance: InstantiatedWasm, ptr: Pointer<number>, value: number): void { return instance.cachedMemoryView.setInt32(ptr, value, true); }
