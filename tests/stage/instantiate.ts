import { alignfault } from "../../dist/env/alignfault.js";
import { _embind_register_bigint } from "../../dist/env/embind_register_bigint.js";
import { _embind_register_bool } from "../../dist/env/embind_register_bool.js";
import { _embind_register_class } from "../../dist/env/embind_register_class.js";
import { _embind_register_class_class_function } from "../../dist/env/embind_register_class_class_function.js";
import { _embind_register_class_constructor } from "../../dist/env/embind_register_class_constructor.js";
import { _embind_register_class_function } from "../../dist/env/embind_register_class_function.js";
import { _embind_register_class_property } from "../../dist/env/embind_register_class_property.js";
import { _embind_register_constant } from "../../dist/env/embind_register_constant.js";
import { _embind_register_emval, _emval_decref, _emval_take_value } from "../../dist/env/embind_register_emval.js";
import { _embind_register_enum, _embind_register_enum_value, } from "../../dist/env/embind_register_enum.js";
import { _embind_register_float } from "../../dist/env/embind_register_float.js";
import { _embind_register_function } from "../../dist/env/embind_register_function.js";
import { _embind_register_integer } from "../../dist/env/embind_register_integer.js";
import { _embind_register_memory_view } from "../../dist/env/embind_register_memory_view.js";
import { _embind_register_std_string } from "../../dist/env/embind_register_std_string.js";
import { _embind_register_std_wstring } from "../../dist/env/embind_register_std_wstring.js";
import { _embind_register_user_type } from "../../dist/env/embind_register_user_type.js";
import { _embind_finalize_value_array, _embind_register_value_array, _embind_register_value_array_element } from "../../dist/env/embind_register_value_array.js";
import { _embind_finalize_value_object, _embind_register_value_object, _embind_register_value_object_field } from "../../dist/env/embind_register_value_object.js";
import { _embind_register_void } from "../../dist/env/embind_register_void.js";
import { emscripten_notify_memory_growth } from "../../dist/env/emscripten_notify_memory_growth.js";
import { segfault } from "../../dist/env/segfault.js";
import { __throw_exception_with_stack_trace } from "../../dist/env/throw_exception_with_stack_trace.js";
import { _tzset_js } from "../../dist/env/tzset_js.js";
import { clock_time_get } from "../../dist/wasi_snapshot_preview1/clock_time_get.js";
import { environ_get } from "../../dist/wasi_snapshot_preview1/environ_get.js";
import { environ_sizes_get } from "../../dist/wasi_snapshot_preview1/environ_sizes_get.js";
import { fd_close } from "../../dist/wasi_snapshot_preview1/fd_close.js";
import { fd_read } from "../../dist/wasi_snapshot_preview1/fd_read.js";
import { fd_seek } from "../../dist/wasi_snapshot_preview1/fd_seek.js";
import { fd_write } from "../../dist/wasi_snapshot_preview1/fd_write.js";
import { proc_exit } from "../../dist/wasi_snapshot_preview1/proc_exit.js";
import { InstantiatedWasm } from "../../dist/wasm.js";


export interface StructTest {
    string: string;
    number: number;
    triple: [number, number, number];
}

export declare class TestClass implements Disposable {
    public x: number;
    public y: string;
    constructor(x: number, y: string);
    incrementX(): TestClass;

    getX(): number;
    setX(x: number): void;

    static getStringFromInstance(instance: TestClass): string;

    static create(): TestClass;

    static identityConstPointer(input: TestClass): TestClass;
    static identityPointer(input: TestClass): TestClass;
    static identityReference(input: TestClass): TestClass;
    static identityConstReference(input: TestClass): TestClass;
    static identityCopy(input: TestClass): TestClass;

    [Symbol.dispose](): void;
}

export interface EmboundTypes {

    identity_u8(n: number): number;
    identity_i8(n: number): number;
    identity_u16(n: number): number;
    identity_i16(n: number): number;
    identity_u32(n: number): number;
    identity_i32(n: number): number;
    identity_u64(n: bigint): bigint;
    identity_i64(n: bigint): bigint;
    identity_string(n: string): string;
    identity_wstring(n: string): string;
    identity_old_enum(n: any): string;
    identity_new_enum(n: any): string;
    identity_struct_pointer(n: StructTest): StructTest;
    struct_create(): StructTest;
    struct_consume(n: StructTest): void;
    identity_struct_copy(n: StructTest): StructTest;
    testClassArray(): number;
    nowSteady(): number;
    nowSystem(): number;
    throwsException(): never;
    catchesException(): never;
    getenv(key: string): string;
    identity_stdout(): void;
    return_stdin(): string;

    TestClass: typeof TestClass;
}

export interface KnownInstanceExports {
    printTest(): number;
    reverseInput(): number;
    getRandomNumber(): number;
    getKey(): number;
}

export async function instantiate(where: string, uninstantiated?: ArrayBuffer): Promise<InstantiatedWasm<KnownInstanceExports, EmboundTypes>> {

    let wasm = new InstantiatedWasm<KnownInstanceExports, EmboundTypes>();
    wasm.addEventListener("environ_get", e => {
        e.detail.strings = [
            ["key_1", "value_1"],
            ["key_2", "value_2"],
            ["key_3", "value_3"]
        ]
    });
    /*wasm.addEventListener("fd_read", e => {
        e.preventDefault();
        let str = "This_is_a_test_string\n";
        let pos = 0;
        e.detail.write = (input) => {
            debugger;
            const result = (new TextEncoder).encodeInto(str.substring(pos), input);
            pos += result.read;
            return result.written;
        }
    });*/
    await wasm.instantiate(uninstantiated ?? fetch(new URL("wasm.wasm", import.meta.url)), {
        env: {
            __throw_exception_with_stack_trace,
            emscripten_notify_memory_growth,
            _embind_register_void,
            _embind_register_bool,
            _embind_register_integer,
            _embind_register_bigint,
            _embind_register_float,
            _embind_register_std_string,
            _embind_register_std_wstring,
            _embind_register_emval,
            _embind_register_memory_view,
            _embind_register_function,
            _embind_register_constant,
            _embind_register_value_array,
            _embind_register_value_array_element,
            _embind_finalize_value_array,
            _embind_register_value_object_field,
            _embind_register_value_object,
            _embind_finalize_value_object,
            _embind_register_class,
            _embind_register_class_property,
            _embind_register_class_class_function,
            _embind_register_class_constructor,
            _embind_register_class_function,
            _embind_register_enum,
            _embind_register_enum_value,
            _emval_take_value,
            _emval_decref,
            _embind_register_user_type,
            _tzset_js,
            segfault,
            alignfault,
        },
        wasi_snapshot_preview1: {
            fd_close,
            fd_read,
            fd_seek,
            fd_write,
            environ_get,
            environ_sizes_get,
            proc_exit,
            clock_time_get
        }
    });

    wasm.addEventListener("fd_write", e => {
        if (e.detail.fileDescriptor == 1) {
            e.preventDefault();
            const value = e.detail.asString("utf-8");
            console.log(`${where}: ${value}`);
        }
    });

    return wasm;
}
