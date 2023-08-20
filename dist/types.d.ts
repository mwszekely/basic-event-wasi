/** @alias fd */
export type FileDescriptor = number;
export type Pointer<T> = number;
export interface PrivateImpl<K extends keyof EntirePublicWasiInterface = never> {
    instance: WebAssembly.Instance;
    module: WebAssembly.Module;
    getMemory(): DataView;
    readPointer<T>(ptr: Pointer<Pointer<T>>): Pointer<T>;
    getPointerSize(): 4;
    /**
     * A return of `false` means the event was cancelled; i.e. `preventDefault` was called.
     */
    dispatchEvent(e: Event): boolean;
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
    wasiSubset: Pick<EntirePublicWasiInterface, K>;
}
export interface EntirePublicWasiInterface {
    proc_exit(code: number): void;
    fd_write(fd: number, iov: number, iovcnt: number, pnum: number): number;
}
