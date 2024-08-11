import type { InstantiatedWasi } from "../instantiated-wasi.js";
import { Is64 } from "./is-64.js";
import { PointerSize } from "./pointer.js";

const SizeTSize: 4 | 8 = PointerSize;
export const setSizeT: "setBigUint64" | "setUint32" = (Is64 ? "setBigUint64" : "setUint32") satisfies keyof DataView;
export const getSizeT: "getBigUint64" | "getUint32" = (Is64 ? "getBigUint64" : "getUint32") satisfies keyof DataView;
export function getSizeTSize(_instance: InstantiatedWasi<{}>): 4 { return SizeTSize as 4; }

