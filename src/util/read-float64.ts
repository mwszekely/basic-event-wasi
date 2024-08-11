import { InstantiatedWasi } from "../instantiated-wasi.js";
import type { Pointer } from "../types.js";


export function readFloat64(instance: InstantiatedWasi<{}>, ptr: Pointer<number>): number { return instance.cachedMemoryView.getFloat64(ptr, true); }
