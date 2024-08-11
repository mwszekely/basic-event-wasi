import { InstantiatedWasi } from "../instantiated-wasi.js";
import type { Pointer } from "../types.js";

export function readUint64(instance: InstantiatedWasi<{}>, ptr: Pointer<number>): bigint { return instance.cachedMemoryView.getBigUint64(ptr, true); }
