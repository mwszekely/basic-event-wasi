import type { Pointer } from "../types.js";
import { InstantiatedWasm } from "../wasm.js";
import { setSizeT } from "./sizet.js";

export function writeSizeT(instance: InstantiatedWasm, ptr: Pointer<number>, value: number): void { instance.cachedMemoryView[setSizeT](ptr, value as never, true); }
