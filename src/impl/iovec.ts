import { PrivateImpl } from "../types.js";
import { getPointerSize, readPointer, readUint32 } from "../util.js";

export interface Iovec {
    bufferStart: number;
    bufferLength: number;
}

export function parse(info: PrivateImpl, ptr: number): Iovec {
    return {
        bufferStart: readPointer(info.instance, ptr),
        bufferLength: readUint32(info.instance, ptr + getPointerSize(info.instance))
    }
}

export function* parseArray(info: PrivateImpl, ptr: number, count: number) {
    const sizeofStruct = getPointerSize(info.instance) + 4;
    for (let i = 0; i < count; ++i) {
        yield parse(info, ptr + (i * sizeofStruct))
    }
}
