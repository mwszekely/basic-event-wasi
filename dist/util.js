import { getImpl } from "./instantiate-wasi.js";
export function getMemory(instance) {
    return getImpl(instance).cachedMemoryView;
}
export function copyToWasm(instance, destinationAddress, sourceData) {
    (new Uint8Array(getMemory(instance).buffer, destinationAddress, sourceData.byteLength)).set(sourceData);
}
export function readUint64(instance, ptr) { return getMemory(instance).getBigUint64(ptr, true); }
export function readInt64(instance, ptr) { return getMemory(instance).getBigInt64(ptr, true); }
export function readUint32(instance, ptr) { return getMemory(instance).getUint32(ptr, true); }
export function readInt32(instance, ptr) { return getMemory(instance).getInt32(ptr, true); }
export function readUint16(instance, ptr) { return getMemory(instance).getUint16(ptr, true); }
export function readInt16(instance, ptr) { return getMemory(instance).getInt16(ptr, true); }
export function readUint8(instance, ptr) { return getMemory(instance).getUint8(ptr); }
export function readInt8(instance, ptr) { return getMemory(instance).getInt8(ptr); }
export function writeUint64(instance, ptr, value) { return getMemory(instance).setBigUint64(ptr, value, true); }
export function writeInt64(instance, ptr, value) { return getMemory(instance).setBigInt64(ptr, value, true); }
export function writeUint32(instance, ptr, value) { return getMemory(instance).setUint32(ptr, value, true); }
export function writeInt32(instance, ptr, value) { return getMemory(instance).setInt32(ptr, value, true); }
export function writeUint16(instance, ptr, value) { return getMemory(instance).setUint16(ptr, value, true); }
export function writeInt16(instance, ptr, value) { return getMemory(instance).setInt16(ptr, value, true); }
export function writeUint8(instance, ptr, value) { return getMemory(instance).setUint8(ptr, value); }
export function writeInt8(instance, ptr, value) { return getMemory(instance).setInt8(ptr, value); }
export function readPointer(instance, ptr) { return getMemory(instance).getUint32(ptr, true); }
export function getPointerSize(_instance) { return 4; }
