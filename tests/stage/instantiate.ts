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
import { instantiate as i } from "../../dist/instantiate.js";
import type { InstantiatedWasi } from "../../dist/instantiated-wasi.js";
import { clock_time_get } from "../../dist/wasi_snapshot_preview1/clock_time_get.js";
import { environ_get } from "../../dist/wasi_snapshot_preview1/environ_get.js";
import { environ_sizes_get } from "../../dist/wasi_snapshot_preview1/environ_sizes_get.js";
import { fd_close } from "../../dist/wasi_snapshot_preview1/fd_close.js";
import { fd_read } from "../../dist/wasi_snapshot_preview1/fd_read.js";
import { fd_seek } from "../../dist/wasi_snapshot_preview1/fd_seek.js";
import { fd_write } from "../../dist/wasi_snapshot_preview1/fd_write.js";
import { proc_exit } from "../../dist/wasi_snapshot_preview1/proc_exit.js";



export interface KnownInstanceExports {
    printTest(): number;
    reverseInput(): number;
    getRandomNumber(): number;
    getKey(): number;
}

export async function instantiate(where: string, uninstantiated?: ArrayBuffer): Promise<InstantiatedWasi<KnownInstanceExports>> {

    let wasm = await i<KnownInstanceExports>(uninstantiated ?? fetch(new URL("wasm.wasm", import.meta.url)), {
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
            const value = e.asString("utf-8");
            console.log(`${where}: ${value}`);
        }
    });

    return wasm;
}
