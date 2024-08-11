import type { InstantiatedWasi } from "../instantiated-wasi.js";
import { Is64 } from "./is-64.js";



export const PointerSize: 4 | 8 = (Is64 ? 8 : 4);
export const getPointer: "getBigUint64" | "getUint32" = (Is64 ? "getBigUint64" : "getUint32") satisfies keyof DataView;
export const setPointer: "setBigUint64" | "setUint32" = (Is64 ? "setBigUint64" : "setUint32") satisfies keyof DataView;

export function getPointerSize(_instance: InstantiatedWasi<{}>): 4 { return PointerSize as 4; }