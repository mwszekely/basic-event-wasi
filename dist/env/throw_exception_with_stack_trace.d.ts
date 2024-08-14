import type { InstantiatedWasm } from "../wasm.js";
export interface WebAssemblyExceptionEventDetail {
    exception: WebAssembly.Exception;
}
declare namespace WebAssembly {
    class Exception {
        constructor(tag: number, payload: number[], options?: {
            traceStack?: boolean;
        });
        getArg(exceptionTag: number, index: number): number;
    }
}
export interface EmscriptenException extends WebAssembly.Exception {
    message: [string, string];
}
export declare function __throw_exception_with_stack_trace(this: InstantiatedWasm, ex: number): void;
export {};
//# sourceMappingURL=throw_exception_with_stack_trace.d.ts.map