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
type EntirePublicWasiInterfaceHelper = {
    [K in keyof typeof SnapshotPreview1]: (typeof SnapshotPreview1)[K];
};
type EntirePublicEnvInterfaceHelper = {
    [K in keyof typeof Env]: (typeof Env)[K];
};
export interface EntirePublicWasiInterface extends EntirePublicWasiInterfaceHelper {
}
export interface EntirePublicEnvInterface extends EntirePublicEnvInterfaceHelper {
}
export interface EntirePublicInterface<K extends keyof EntirePublicWasiInterface, L extends keyof EntirePublicEnvInterface> {
    wasi_snapshot_preview1: Pick<EntirePublicWasiInterface, K>;
    env: Pick<EntirePublicEnvInterface, L>;
}
export declare const KnownExports: {
    readonly wasi_snapshot_preview1: (keyof EntirePublicEnvInterface)[];
    readonly env: (keyof EntirePublicEnvInterface)[];
};
export {};
