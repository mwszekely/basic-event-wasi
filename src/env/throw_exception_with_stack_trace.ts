import { getExceptionMessage } from "../_private/exception.js";
import type { InstantiatedWasm } from "../wasm.js";

export interface WebAssemblyExceptionEventDetail { exception: WebAssembly.Exception }

// eslint-disable-next-line @typescript-eslint/no-namespace
declare namespace WebAssembly {
    class Exception {
        constructor(tag: number, payload: number[], options?: { traceStack?: boolean });
        getArg(exceptionTag: number, index: number): number;
    }
}

export interface EmscriptenException extends WebAssembly.Exception {
    message: [string, string];
}

export function __throw_exception_with_stack_trace(this: InstantiatedWasm, ex: number): void {
    const t = new WebAssembly.Exception((this.exports).__cpp_exception, [ex], { traceStack: true }) as EmscriptenException;
    t.message = getExceptionMessage(this, t);
    // eslint-disable-next-line @typescript-eslint/only-throw-error
    throw t;
}
