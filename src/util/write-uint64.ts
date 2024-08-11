import { InstantiatedWasi } from "../instantiated-wasi.js";
import type { Pointer } from "../types.js";

export function writeUint64(instance: InstantiatedWasi<{}>, ptr: Pointer<number>, value: bigint): void { return instance.cachedMemoryView.setBigUint64(ptr, value, true); }
