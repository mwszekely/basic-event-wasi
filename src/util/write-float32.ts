import type { Pointer } from "../types.js";
import { InstantiatedWasm } from "../wasm.js";

export function writeFloat32(instance: InstantiatedWasm, ptr: Pointer<number>, value: number): void { return instance.cachedMemoryView.setFloat32(ptr, value, true); }
