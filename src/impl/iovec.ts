import { PrivateImpl } from "../types.js";

export interface Iovec {
    bufferStart: number;
    bufferLength: number;
}

export function parse(info: PrivateImpl, ptr: number): Iovec {
    return {
        bufferStart: info.readPointer(ptr),
        bufferLength: info.readUint32(ptr + info.getPointerSize())
    }
}

export function* parseArray(info: PrivateImpl, ptr: number, count: number) {
    const sizeofStruct = info.getPointerSize() + 4;
    for (let i = 0; i < count; ++i) {
        yield parse(info, ptr + (i * sizeofStruct))
    }
}
