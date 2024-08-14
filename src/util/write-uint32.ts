import type { Pointer } from "../types.js";
import { InstantiatedWasm } from "../wasm.js";

export function writeUint32(instance: InstantiatedWasm, ptr: Pointer<number>, value: number): void { return instance.cachedMemoryView.setUint32(ptr, value, true); }
