export function parse(info, ptr) {
    return {
        bufferStart: info.readPointer(ptr),
        bufferLength: info.readUint32(ptr + info.getPointerSize())
    };
}
export function* parseArray(info, ptr, count) {
    const sizeofStruct = info.getPointerSize() + 4;
    for (let i = 0; i < count; ++i) {
        yield parse(info, ptr + (i * sizeofStruct));
    }
}
