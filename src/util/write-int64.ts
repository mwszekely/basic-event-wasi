import { InstantiatedWasi } from "../instantiated-wasi.js";
import type { Pointer } from "../types.js";

export function writeInt64(instance: InstantiatedWasi<{}>, ptr: Pointer<number>, value: bigint): void { return instance.cachedMemoryView.setBigInt64(ptr, value, true); }
