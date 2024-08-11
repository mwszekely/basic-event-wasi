import { InstantiatedWasi } from "../instantiated-wasi.js";
import type { Pointer } from "../types.js";

export function readFloat32(instance: InstantiatedWasi<{}>, ptr: Pointer<number>): number { return instance.cachedMemoryView.getFloat32(ptr, true); }
