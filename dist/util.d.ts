import type { KnownInstanceExports, Pointer } from "./types.js";
export declare function getMemory(instance: WebAssembly.Instance): DataView;
export declare function copyToWasm(instance: WebAssembly.Instance, destinationAddress: Pointer<number>, sourceData: Uint8Array | Int8Array): void;
export declare function readUint64(instance: WebAssembly.Instance, ptr: Pointer<number>): bigint;
export declare function readInt64(instance: WebAssembly.Instance, ptr: Pointer<number>): bigint;
export declare function readUint32(instance: WebAssembly.Instance, ptr: Pointer<number>): number;
export declare function readInt32(instance: WebAssembly.Instance, ptr: Pointer<number>): number;
export declare function readUint16(instance: WebAssembly.Instance, ptr: Pointer<number>): number;
export declare function readInt16(instance: WebAssembly.Instance, ptr: Pointer<number>): number;
export declare function readUint8(instance: WebAssembly.Instance, ptr: Pointer<number>): number;
export declare function readInt8(instance: WebAssembly.Instance, ptr: Pointer<number>): number;
export declare function writeUint64(instance: WebAssembly.Instance, ptr: Pointer<number>, value: bigint): void;
export declare function writeInt64(instance: WebAssembly.Instance, ptr: Pointer<number>, value: bigint): void;
export declare function writeUint32(instance: WebAssembly.Instance, ptr: Pointer<number>, value: number): void;
export declare function writeInt32(instance: WebAssembly.Instance, ptr: Pointer<number>, value: number): void;
export declare function writeUint16(instance: WebAssembly.Instance, ptr: Pointer<number>, value: number): void;
export declare function writeInt16(instance: WebAssembly.Instance, ptr: Pointer<number>, value: number): void;
export declare function writeUint8(instance: WebAssembly.Instance, ptr: Pointer<number>, value: number): void;
export declare function writeInt8(instance: WebAssembly.Instance, ptr: Pointer<number>, value: number): void;
export declare function readPointer(instance: WebAssembly.Instance, ptr: Pointer<number>): number;
export declare function getPointerSize(_instance: WebAssembly.Instance): number;
export declare function getInstanceExports(instance: WebAssembly.Instance): KnownInstanceExports;
