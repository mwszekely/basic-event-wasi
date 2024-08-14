import type { Pointer } from "../types.js";
import { InstantiatedWasm } from "../wasm.js";


export function writeFloat64(instance: InstantiatedWasm, ptr: Pointer<number>, value: number): void { return instance.cachedMemoryView.setFloat64(ptr, value, true); }
