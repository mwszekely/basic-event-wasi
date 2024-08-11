import { InstantiatedWasi } from "../instantiated-wasi.js";
import type { Pointer } from "../types.js";

export function writeInt16(instance: InstantiatedWasi<{}>, ptr: Pointer<number>, value: number): void { return instance.cachedMemoryView.setInt16(ptr, value, true); }
