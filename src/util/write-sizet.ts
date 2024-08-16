import { InstantiatedWasm } from "../wasm.js";
import { setSizeT } from "./sizet.js";

export function writeSizeT(instance: InstantiatedWasm, ptr: number, value: number): void { instance.cachedMemoryView[setSizeT](ptr, value as never, true); }
