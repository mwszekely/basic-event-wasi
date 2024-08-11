import { InstantiatedWasi } from "../instantiated-wasi.js";
import type { Pointer } from "../types.js";

export function writeUint8(instance: InstantiatedWasi<{}>, ptr: Pointer<number>, value: number): void { return instance.cachedMemoryView.setUint8(ptr, value); }
