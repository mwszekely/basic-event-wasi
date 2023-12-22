import { getPointerSize, readPointer, readUint32 } from "../util.js";
export function parse(info, ptr) {
    return {
        bufferStart: readPointer(info.instance, ptr),
        bufferLength: readUint32(info.instance, ptr + getPointerSize(info.instance))
    };
}
export function* parseArray(info, ptr, count) {
    const sizeofStruct = getPointerSize(info.instance) + 4;
    for (let i = 0; i < count; ++i) {
        yield parse(info, ptr + (i * sizeofStruct));
    }
}
