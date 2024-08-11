import { InstantiatedWasi } from "../instantiated-wasi.js";
import type { Pointer } from "../types.js";

export function readInt8(instance: InstantiatedWasi<{}>, ptr: Pointer<number>): number { return instance.cachedMemoryView.getInt8(ptr); }
