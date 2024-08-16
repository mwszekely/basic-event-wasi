
import { InstantiatedWasm } from "../wasm.js";

export function writeInt32(instance: InstantiatedWasm, ptr: number, value: number): void { return instance.cachedMemoryView.setInt32(ptr, value, true); }
