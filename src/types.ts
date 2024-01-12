import type {
    __throw_exception_with_stack_trace,
    emscripten_notify_memory_growth,
    environ_get,
    environ_sizes_get,
    fd_close,
    fd_read,
    fd_seek,
    fd_write,
    proc_exit
} from "./index.js";

/** @alias fd */
export type FileDescriptor = number;

export type Pointer<_T> = number;

export interface KnownInstanceExports {
    free(ptr: number): void;
    malloc(size: number): number;
    realloc(ptr: number, size: number) : number;
    memory: WebAssembly.Memory;
}

/**
 * Any WASI function will have `this` set to a `PrivateImpl` representing its global state.
 * 
 * Use this to implement those functions.
 */
export interface PrivateImpl {
    instance: WebAssembly.Instance;
    module: WebAssembly.Module;
    cachedMemoryView: DataView | null;

    /**
     * A return of `false` means the event was cancelled; i.e. `preventDefault` was called.
     */
    dispatchEvent(e: Event): boolean;
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

export const KnownExports = {
    "wasi_snapshot_preview1": ["environ_get", "environ_sizes_get", "fd_close", "fd_read", "fd_seek", "fd_write", "proc_exit"],
    "env": ["emscripten_notify_memory_growth", "__throw_exception_with_stack_trace"]
} as const;