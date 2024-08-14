import type { Pointer } from "../types.js";
import { InstantiatedWasm } from "../wasm.js";

export function writeUint8(instance: InstantiatedWasm, ptr: Pointer<number>, value: number): void { return instance.cachedMemoryView.setUint8(ptr, value); }
