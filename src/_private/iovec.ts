import { getPointerSize } from "../util/pointer.js";
import { readPointer } from "../util/read-pointer.js";
import { readUint32 } from "../util/read-uint32.js";
import type { InstantiatedWasm } from "../wasm.js";

export interface Iovec {
    bufferStart: number;
    bufferLength: number;
}

export function parse(info: InstantiatedWasm, ptr: number): Iovec {
    return {
        bufferStart: readPointer(info, ptr),
        bufferLength: readUint32(info, ptr + getPointerSize(info))
    }
}

export function* parseArray(info: InstantiatedWasm, ptr: number, count: number): Generator<Iovec, void, void> {
    const sizeofStruct = getPointerSize(info) + 4;
    for (let i = 0; i < count; ++i) {
        yield parse(info, ptr + (i * sizeofStruct))
    }
}