import { InstantiatedWasi } from "../instantiated-wasi.js";
import type { Pointer } from "../types.js";

export function writeUint32(instance: InstantiatedWasi<{}>, ptr: Pointer<number>, value: number): void { return instance.cachedMemoryView.setUint32(ptr, value, true); }
