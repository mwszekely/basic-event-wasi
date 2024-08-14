import { getExceptionMessage } from "../_private/exception.js";
import type { InstantiatedWasm } from "../wasm.js";

export interface WebAssemblyExceptionEventDetail { exception: WebAssembly.Exception }

declare namespace WebAssembly {
    class Exception {
        constructor(tag: number, payload: number[], options?: { traceStack?: boolean });
        getArg(exceptionTag: number, index: number): number;
    }
}

export interface EmscriptenException extends WebAssembly.Exception {
    message: [string, string];
}
/*
export class WebAssemblyExceptionEvent extends CustomEvent<WebAssemblyExceptionEventDetail> {
    constructor(impl: InstantiatedWasm, exception: WebAssembly.Exception) {
        super("WebAssemblyExceptionEvent", { cancelable: true, detail: { exception } })
    }
}
*/
export function __throw_exception_with_stack_trace(this: InstantiatedWasm, ex: any): void {
    const t = new WebAssembly.Exception((this.exports).__cpp_exception, [ex], { traceStack: true }) as EmscriptenException;
    t.message = getExceptionMessage(this, t);
    throw t;
}
