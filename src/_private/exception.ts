import { EmscriptenException } from "../env/throw_exception_with_stack_trace.js";
import { InstantiatedWasi } from "../instantiated-wasi.js";
import { getPointerSize } from "../util/pointer.js";
import { readPointer } from "../util/read-pointer.js";
import { utf8ToStringZ } from "./string.js";


export function getExceptionMessage(impl: InstantiatedWasi<{}>, ex: EmscriptenException): [string, string] {
    var ptr = getCppExceptionThrownObjectFromWebAssemblyException(impl, ex);
    return getExceptionMessageCommon(impl, ptr);
}

function getCppExceptionThrownObjectFromWebAssemblyException(impl: InstantiatedWasi<{}>, ex: EmscriptenException) {
    // In Wasm EH, the value extracted from WebAssembly.Exception is a pointer
    // to the unwind header. Convert it to the actual thrown value.
    const unwind_header: number = ex.getArg((impl.exports).__cpp_exception, 0);
    return (impl.exports).__thrown_object_from_unwind_exception(unwind_header);
}

function stackSave(impl: InstantiatedWasi<{}>) {
    return impl.exports.emscripten_stack_get_current();
}
function stackAlloc(impl: InstantiatedWasi<{}>, size: number) {
    return impl.exports._emscripten_stack_alloc(size);
}
function stackRestore(impl: InstantiatedWasi<{}>, stackPointer: number) {
    return impl.exports._emscripten_stack_restore(stackPointer);
}

function getExceptionMessageCommon(impl: InstantiatedWasi<{}>, ptr: number): [string, string] {
    const sp = stackSave(impl);
    const type_addr_addr = stackAlloc(impl, getPointerSize(impl));
    const message_addr_addr = stackAlloc(impl, getPointerSize(impl));
    impl.exports.__get_exception_message(ptr, type_addr_addr, message_addr_addr);
    const type_addr = readPointer(impl, type_addr_addr);
    const message_addr = readPointer(impl, message_addr_addr);
    const type = utf8ToStringZ(impl, type_addr);
    impl.exports.free(type_addr);
    let message = "";
    if (message_addr) {
        message = utf8ToStringZ(impl, message_addr);
        impl.exports.free(message_addr);
    }
    stackRestore(impl, sp);
    return [type, message];
}

