import { InstantiatedWasm } from "../wasm.js";

export function writeUint64(instance: InstantiatedWasm, ptr: number, value: bigint): void { return instance.cachedMemoryView.setBigUint64(ptr, value, true); }
