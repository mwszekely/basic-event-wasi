import { InstantiatedWasi } from "../instantiated-wasi.js";
import type { Pointer } from "../types.js";

export function readUint16(instance: InstantiatedWasi<{}>, ptr: Pointer<number>): number { return instance.cachedMemoryView.getUint16(ptr, true); }
