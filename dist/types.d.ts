import type { __throw_exception_with_stack_trace, emscripten_notify_memory_growth, environ_get, environ_sizes_get, fd_close, fd_read, fd_seek, fd_write, proc_exit } from "./index.js";
/** @alias fd */
export type FileDescriptor = number;
export type Pointer<T> = number;
/**
 * Any WASI function will have `this` set to a `PrivateImpl` representing its global state.
 *
 * Use this to implement those functions.
 */
export interface PrivateImpl<K extends keyof EntirePublicWasiInterface = never, L extends keyof EntirePublicEnvInterface = never> {
    instance: WebAssembly.Instance;
    module: WebAssembly.Module;
    getMemory(): DataView;
    getPointerSize(): 4;
    /**
     * A return of `false` means the event was cancelled; i.e. `preventDefault` was called.
     */
    dispatchEvent(e: Event): boolean;
    readPointer<T>(ptr: Pointer<Pointer<T>>): Pointer<T>;
    readUint64(ptr: Pointer<bigint>): bigint;
    writeUint64(ptr: Pointer<bigint>, value: bigint): void;
    readInt64(ptr: Pointer<bigint>): bigint;
    writeInt64(ptr: Pointer<bigint>, value: bigint): void;
    readUint32(ptr: Pointer<number>): number;
    writeUint32(ptr: Pointer<number>, value: number): void;
    readInt32(ptr: Pointer<number>): number;
    writeInt32(ptr: Pointer<number>, value: number): void;
    readUint16(ptr: Pointer<number>): number;
    writeUint16(ptr: Pointer<number>, value: number): void;
    readInt16(ptr: Pointer<number>): number;
    writeInt16(ptr: Pointer<number>, value: number): void;
    readUint8(ptr: Pointer<number>): number;
    writeUint8(ptr: Pointer<number>, value: number): void;
    readInt8(ptr: Pointer<number>): number;
    writeInt8(ptr: Pointer<number>, value: number): void;
    wasiSubset: EntirePublicInterface<K, L>;
}
export interface EntirePublicWasiInterface {
    proc_exit: typeof proc_exit;
    fd_write: typeof fd_write;
    fd_close: typeof fd_close;
    fd_read: typeof fd_read;
    fd_seek: typeof fd_seek;
    environ_get: typeof environ_get;
    environ_sizes_get: typeof environ_sizes_get;
}
export interface EntirePublicEnvInterface {
    __throw_exception_with_stack_trace: typeof __throw_exception_with_stack_trace;
    emscripten_notify_memory_growth: typeof emscripten_notify_memory_growth;
}
export interface EntirePublicInterface<K extends keyof EntirePublicWasiInterface, L extends keyof EntirePublicEnvInterface> {
    wasi_snapshot_preview1: Pick<EntirePublicWasiInterface, K>;
    env: Pick<EntirePublicEnvInterface, L>;
}
export declare const KnownExports: {
    readonly wasi_snapshot_preview1: readonly ["environ_get", "environ_sizes_get", "fd_close", "fd_read", "fd_seek", "fd_write", "proc_exit"];
    readonly env: readonly ["emscripten_notify_memory_growth", "__throw_exception_with_stack_trace"];
};
