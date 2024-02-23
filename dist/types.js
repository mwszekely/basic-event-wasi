// TODO: Better way to type-guarantee we get all the strings of each function name.
// Also TODO: Why is this needed again? Who uses this?
const u = undefined;
const w = {
    environ_get: u,
    environ_sizes_get: u,
    fd_close: u,
    fd_read: u,
    fd_seek: u,
    fd_write: u,
    proc_exit: u
};
const e = {
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
};
export const KnownExports = {
    "wasi_snapshot_preview1": Object.keys(w),
    "env": Object.keys(e),
};
