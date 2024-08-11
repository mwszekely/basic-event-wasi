import { InstantiatedWasi } from "../instantiated-wasi.js";
import type { Pointer } from "../types.js";

export function readInt64(instance: InstantiatedWasi<{}>, ptr: Pointer<number>): bigint { return instance.cachedMemoryView.getBigInt64(ptr, true); }
