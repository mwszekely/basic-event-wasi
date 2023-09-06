export { emscripten_notify_memory_growth } from "./impl/env/emscripten_notify_memory_growth.js";
export { __throw_exception_with_stack_trace } from "./impl/env/throw_exception_with_stack_trace.js";
export { environ_get } from "./impl/wasi_snapshot_preview1/environ_get.js";
export { environ_sizes_get } from "./impl/wasi_snapshot_preview1/environ_sizes_get.js";
export { fd_close } from "./impl/wasi_snapshot_preview1/fd_close.js";
export { fd_read } from "./impl/wasi_snapshot_preview1/fd_read.js";
export { fd_seek } from "./impl/wasi_snapshot_preview1/fd_seek.js";
export { fd_write } from "./impl/wasi_snapshot_preview1/fd_write.js";
export { proc_exit } from "./impl/wasi_snapshot_preview1/proc_exit.js";
export { instantiateWasi } from "./instantiate-wasi.js";
export const KnownExports = {
    "wasi_snapshot_preview1": ["environ_get", "environ_sizes_get", "fd_close", "fd_read", "fd_seek", "fd_write", "proc_exit"],
    "env": ["emscripten_notify_memory_growth", "__throw_exception_with_stack_trace"]
};
