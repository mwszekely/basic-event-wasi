import type { __throw_exception_with_stack_trace, _embind_finalize_value_array, _embind_finalize_value_object, _embind_register_bigint, _embind_register_bool, _embind_register_class, _embind_register_class_class_function, _embind_register_class_constructor, _embind_register_class_function, _embind_register_class_property, _embind_register_constant, _embind_register_emval, _embind_register_enum, _embind_register_enum_value, _embind_register_float, _embind_register_function, _embind_register_integer, _embind_register_memory_view, _embind_register_std_string, _embind_register_std_wstring, _embind_register_user_type, _embind_register_value_array, _embind_register_value_array_element, _embind_register_value_object, _embind_register_value_object_field, _embind_register_void, _emval_decref, _emval_take_value, _tzset_js, alignfault, clock_time_get, emscripten_notify_memory_growth, environ_get, environ_sizes_get, fd_close, fd_read, fd_seek, fd_write, proc_exit, segfault } from "./index.js";
/** @alias fd */
export type FileDescriptor = number;
export type Pointer<_T> = number;
export interface KnownExports {
    free(ptr: number): void;
    malloc(size: number): number;
    realloc(ptr: number, size: number): number;
    memory: WebAssembly.Memory;
    __indirect_function_table: WebAssembly.Table;
    __getTypeName(type: number): number;
    emscripten_stack_get_current(): number;
    _emscripten_stack_alloc(size: number): number;
    _emscripten_stack_restore(sp: number): number;
    __cpp_exception: number;
    __thrown_object_from_unwind_exception(header: number): number;
    __get_exception_message(ptr: number, typePtrPtr: number, messagePtrPtr: number): number;
}
/**
 * Any WASI function will have `this` set to a `PrivateImpl` representing its global state.
 *
 * Use this to implement those functions.

export interface PrivateImpl {
    //instance: WebAssembly.Instance;
    //module: WebAssembly.Module;
    source: InstantiatedWasm;

} */
export interface KnownImportsWasi {
    proc_exit: typeof proc_exit;
    fd_write: typeof fd_write;
    fd_close: typeof fd_close;
    fd_read: typeof fd_read;
    fd_seek: typeof fd_seek;
    clock_time_get: typeof clock_time_get;
    environ_get: typeof environ_get;
    environ_sizes_get: typeof environ_sizes_get;
}
export interface KnownImportsEnv {
    __throw_exception_with_stack_trace: typeof __throw_exception_with_stack_trace;
    emscripten_notify_memory_growth: typeof emscripten_notify_memory_growth;
    _embind_register_void: typeof _embind_register_void;
    _embind_register_bool: typeof _embind_register_bool;
    _embind_register_integer: typeof _embind_register_integer;
    _embind_register_bigint: typeof _embind_register_bigint;
    _embind_register_float: typeof _embind_register_float;
    _embind_register_std_string: typeof _embind_register_std_string;
    _embind_register_std_wstring: typeof _embind_register_std_wstring;
    _embind_register_emval: typeof _embind_register_emval;
    _embind_register_memory_view: typeof _embind_register_memory_view;
    _embind_register_function: typeof _embind_register_function;
    _embind_register_constant: typeof _embind_register_constant;
    _embind_register_value_array: typeof _embind_register_value_array;
    _embind_register_value_array_element: typeof _embind_register_value_array_element;
    _embind_finalize_value_array: typeof _embind_finalize_value_array;
    _embind_register_value_object_field: typeof _embind_register_value_object_field;
    _embind_register_value_object: typeof _embind_register_value_object;
    _embind_finalize_value_object: typeof _embind_finalize_value_object;
    _embind_register_class: typeof _embind_register_class;
    _embind_register_class_property: typeof _embind_register_class_property;
    _embind_register_class_class_function: typeof _embind_register_class_class_function;
    _embind_register_class_constructor: typeof _embind_register_class_constructor;
    _embind_register_class_function: typeof _embind_register_class_function;
    _embind_register_enum: typeof _embind_register_enum;
    _embind_register_enum_value: typeof _embind_register_enum_value;
    _emval_take_value: typeof _emval_take_value;
    _embind_register_user_type: typeof _embind_register_user_type;
    _emval_decref: typeof _emval_decref;
    _tzset_js: typeof _tzset_js;
    segfault: typeof segfault;
    alignfault: typeof alignfault;
}
export interface KnownImports {
    wasi_snapshot_preview1: Partial<KnownImportsWasi>;
    env: Partial<KnownImportsEnv>;
}
//# sourceMappingURL=types.d.ts.map