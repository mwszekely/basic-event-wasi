import { InstantiatedWasi } from "../instantiated-wasi.js";
import type { Pointer } from "../types.js";

export function writeInt32(instance: InstantiatedWasi<{}>, ptr: Pointer<number>, value: number): void { return instance.cachedMemoryView.setInt32(ptr, value, true); }
