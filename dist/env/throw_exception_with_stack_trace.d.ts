import type { InstantiatedWasi } from "../instantiated-wasi.js";
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
export declare function __throw_exception_with_stack_trace(this: InstantiatedWasi<{}>, ex: any): void;
export {};
//# sourceMappingURL=throw_exception_with_stack_trace.d.ts.map