import { InstantiatedWasi } from "../instantiated-wasi.js";
import type { Pointer } from "../types.js";

export function readUint8(instance: InstantiatedWasi<{}>, ptr: Pointer<number>): number { return instance.cachedMemoryView.getUint8(ptr); }
