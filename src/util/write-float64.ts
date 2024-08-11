import { InstantiatedWasi } from "../instantiated-wasi.js";
import type { Pointer } from "../types.js";


export function writeFloat64(instance: InstantiatedWasi<{}>, ptr: Pointer<number>, value: number): void { return instance.cachedMemoryView.setFloat64(ptr, value, true); }
