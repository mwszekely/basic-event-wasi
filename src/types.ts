import type * as Env from "./impl/env/index.js";
import type * as SnapshotPreview1 from "./impl/wasi_snapshot_preview1/index.js";

/** @alias fd */
export type FileDescriptor = number;

export type Pointer<_T> = number;

export interface KnownInstanceExports {
    free(ptr: number): void;
    malloc(size: number): number;
    realloc(ptr: number, size: number): number;
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

type EntirePublicWasiInterfaceHelper = { [K in keyof typeof SnapshotPreview1]: (typeof SnapshotPreview1)[K]; }
type EntirePublicEnvInterfaceHelper = { [K in keyof typeof Env]: (typeof Env)[K]; }

export interface EntirePublicWasiInterface extends EntirePublicWasiInterfaceHelper {}
export interface EntirePublicEnvInterface extends EntirePublicEnvInterfaceHelper {}

export interface EntirePublicInterface<K extends keyof EntirePublicWasiInterface, L extends keyof EntirePublicEnvInterface> {
    wasi_snapshot_preview1: Pick<EntirePublicWasiInterface, K>;
    env: Pick<EntirePublicEnvInterface, L>;
}

// TODO: Better way to type-guarantee we get all the strings of each function name.
// Also TODO: Why is this needed again? Who uses this?
const u = undefined;
const w: Record<keyof EntirePublicWasiInterface, undefined> = {
    environ_get: u,
    environ_sizes_get: u,
    fd_close: u,
    fd_read: u,
    fd_seek: u,
    fd_write: u,
    proc_exit: u
}
const e: Record<keyof EntirePublicEnvInterface, undefined> = {
    __throw_exception_with_stack_trace: u,
    emscripten_notify_memory_growth: u,
    _embind_register_bigint: u,
    _embind_register_bool: u,
    _embind_register_emval: u,
    _embind_register_float: u,
    _embind_register_function: u,
    _embind_register_integer: u,
    _embind_register_memory_view: u,
    _embind_register_std_string: u,
    _embind_register_std_wstring: u,
    _embind_register_void: u,
}

export const KnownExports = {
    "wasi_snapshot_preview1": Object.keys(w) as Array<keyof EntirePublicEnvInterface>,
    "env": Object.keys(e) as Array<keyof EntirePublicEnvInterface>,
} as const;
