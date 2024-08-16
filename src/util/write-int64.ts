import { InstantiatedWasm } from "../wasm.js";

export function writeInt64(instance: InstantiatedWasm, ptr: number, value: bigint): void { return instance.cachedMemoryView.setBigInt64(ptr, value, true); }
