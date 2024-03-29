
export { emscripten_notify_memory_growth } from "./impl/env/emscripten_notify_memory_growth.js"
export { __throw_exception_with_stack_trace } from "./impl/env/throw_exception_with_stack_trace.js"
export { environ_get } from "./impl/wasi_snapshot_preview1/environ_get.js"
export { environ_sizes_get } from "./impl/wasi_snapshot_preview1/environ_sizes_get.js"
export { fd_close } from "./impl/wasi_snapshot_preview1/fd_close.js"
export { fd_read } from "./impl/wasi_snapshot_preview1/fd_read.js"
export { fd_seek } from "./impl/wasi_snapshot_preview1/fd_seek.js"
export { fd_write } from "./impl/wasi_snapshot_preview1/fd_write.js"
export { proc_exit } from "./impl/wasi_snapshot_preview1/proc_exit.js"
export { instantiateWasi } from "./instantiate-wasi.js"
export { RollupWasmPromise, instantiateFromRollupWithWasi, instantiateStreamingWithWasi, instantiateWithWasi } from "./instantiate-wasm.js"

export {
    copyToWasm,
    getInstanceExports,
    getMemory,
    getPointerSize,
    readInt16,
    readInt32,
    readInt64,
    readInt8,
    readPointer,
    readUint16,
    readUint32,
    readUint64,
    readUint8,
    writeInt16,
    writeInt32,
    writeInt64,
    writeInt8,
    writeUint16,
    writeUint32,
    writeUint64,
    writeUint8
} from "./util.js"

export {
    InvalidArrayLengthError,
    NativeBigInt64Array,
    NativeBigUint64Array,
    NativeInt16Array,
    NativeInt32Array,
    NativeInt8Array,
    NativeUint16Array,
    NativeUint32Array,
    NativeUint8Array,
    NativeUint8ClampedArray
} from "./native-array.js"

export { KnownExports, type KnownInstanceExports, type Pointer } from "./types.js"

export type { MemoryGrowthEvent, MemoryGrowthEventDetail } from "./impl/env/emscripten_notify_memory_growth.js"
export type { WebAssemblyExceptionEvent, WebAssemblyExceptionEventDetail } from "./impl/env/throw_exception_with_stack_trace.js"
export type { FileDescriptorCloseEvent, FileDescriptorCloseEventDetail } from "./impl/wasi_snapshot_preview1/fd_close.js"
export type { FileDescriptorReadEvent, FileDescriptorReadEventDetail, UnhandledFileReadEvent } from "./impl/wasi_snapshot_preview1/fd_read.js"
export type { FileDescriptorSeekEvent, FileDescriptorSeekEventDetail } from "./impl/wasi_snapshot_preview1/fd_seek.js"
export type { FileDescriptorWriteEvent, FileDescriptorWriteEventDetail, UnhandledFileWriteEvent } from "./impl/wasi_snapshot_preview1/fd_write.js"
export type { AbortError, AbortEvent, AbortEventDetail } from "./impl/wasi_snapshot_preview1/proc_exit.js"

