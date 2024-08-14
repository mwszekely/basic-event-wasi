import { getPointerSize } from "../../util/pointer.js";
import { readPointer } from "../../util/read-pointer.js";
import type { InstantiatedWasm } from "../../wasm.js";

/**
 * Generally, Embind functions include an array of RTTI TypeIds in the form of
 * [RetType, ThisType?, ...ArgTypes]
 * 
 * This returns that array of typeIds for a given function.
 */
export function readArrayOfTypes(impl: InstantiatedWasm, count: number, rawArgTypesPtr: number): number[] {
    const ret: number[] = [];
    const pointerSize = getPointerSize(impl);

    for (let i = 0; i < count; ++i) {
        ret.push(readPointer(impl, rawArgTypesPtr + i * pointerSize));
    }
    return ret;
}
