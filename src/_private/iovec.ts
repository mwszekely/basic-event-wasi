import { getPointerSize } from "../util/pointer.js";
import { readPointer } from "../util/read-pointer.js";
import { readUint32 } from "../util/read-uint32.js";
import type { InstantiatedWasm } from "../wasm.js";

export interface Iovec {
    bufferStart: number;
    bufferLength: number;
    uint8: Uint8Array;
}

export function parse(info: InstantiatedWasm, ptr: number): Iovec {
    const bufferStart = readPointer(info, ptr);
    const bufferLength = readUint32(info, ptr + getPointerSize(info));
    const uint8 = new Uint8Array(info.cachedMemoryView.buffer, bufferStart, bufferLength);
    return {
        bufferStart,
        bufferLength,
        uint8
    }
}

export function parseArray(info: InstantiatedWasm, ptr: number, count: number): Iovec[] {
    const sizeofStruct = getPointerSize(info) + 4;
    const ret: Iovec[] = [];
    for (let i = 0; i < count; ++i) {
        ret.push(parse(info, ptr + (i * sizeofStruct)));
    }
    return ret;
}
