import { InstantiatedWasi } from "../instantiated-wasi.js";
import type { Pointer } from "../types.js";
import { setSizeT } from "./sizet.js";

export function writeSizeT(instance: InstantiatedWasi<{}>, ptr: Pointer<number>, value: number): void { instance.cachedMemoryView[setSizeT](ptr, value as never, true); }
