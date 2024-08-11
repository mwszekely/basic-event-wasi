import { InstantiatedWasi } from "../instantiated-wasi.js";
import type { Pointer } from "../types.js";

export function readUint32(instance: InstantiatedWasi<{}>, ptr: Pointer<number>): number { return instance.cachedMemoryView.getUint32(ptr, true); }
