import { getImpl } from "./instantiate-wasi.js";
import type { KnownInstanceExports, Pointer } from "./types.js";

export function getMemory(instance: WebAssembly.Instance) {
    return getImpl(instance).cachedMemoryView!;
}

export function copyToWasm(instance: WebAssembly.Instance, destinationAddress: Pointer<number>, sourceData: Uint8Array | Int8Array) {
    (new Uint8Array(getMemory(instance).buffer, destinationAddress, sourceData.byteLength)).set(sourceData);
}

export function readUint64(instance: WebAssembly.Instance, ptr: Pointer<number>) { return getMemory(instance).getBigUint64(ptr, true); }
export function readInt64(instance: WebAssembly.Instance, ptr: Pointer<number>) { return getMemory(instance).getBigInt64(ptr, true); }
export function readUint32(instance: WebAssembly.Instance, ptr: Pointer<number>) { return getMemory(instance).getUint32(ptr, true); }
export function readInt32(instance: WebAssembly.Instance, ptr: Pointer<number>) { return getMemory(instance).getInt32(ptr, true); }
export function readUint16(instance: WebAssembly.Instance, ptr: Pointer<number>) { return getMemory(instance).getUint16(ptr, true); }
export function readInt16(instance: WebAssembly.Instance, ptr: Pointer<number>) { return getMemory(instance).getInt16(ptr, true); }
export function readUint8(instance: WebAssembly.Instance, ptr: Pointer<number>) { return getMemory(instance).getUint8(ptr); }
export function readInt8(instance: WebAssembly.Instance, ptr: Pointer<number>) { return getMemory(instance).getInt8(ptr); }

export function writeUint64(instance: WebAssembly.Instance, ptr: Pointer<number>, value: bigint) { return getMemory(instance).setBigUint64(ptr, value, true); }
export function writeInt64(instance: WebAssembly.Instance, ptr: Pointer<number>, value: bigint) { return getMemory(instance).setBigInt64(ptr, value, true); }
export function writeUint32(instance: WebAssembly.Instance, ptr: Pointer<number>, value: number) { return getMemory(instance).setUint32(ptr, value, true); }
export function writeInt32(instance: WebAssembly.Instance, ptr: Pointer<number>, value: number) { return getMemory(instance).setInt32(ptr, value, true); }
export function writeUint16(instance: WebAssembly.Instance, ptr: Pointer<number>, value: number) { return getMemory(instance).setUint16(ptr, value, true); }
export function writeInt16(instance: WebAssembly.Instance, ptr: Pointer<number>, value: number) { return getMemory(instance).setInt16(ptr, value, true); }
export function writeUint8(instance: WebAssembly.Instance, ptr: Pointer<number>, value: number) { return getMemory(instance).setUint8(ptr, value); }
export function writeInt8(instance: WebAssembly.Instance, ptr: Pointer<number>, value: number) { return getMemory(instance).setInt8(ptr, value); }


export function readPointer(instance: WebAssembly.Instance, ptr: Pointer<number>) { return getMemory(instance).getUint32(ptr, true); }
export function getPointerSize(_instance: WebAssembly.Instance) { return 4; }

export function getInstanceExports(instance: WebAssembly.Instance) {
    return instance.exports as unknown as KnownInstanceExports;
}