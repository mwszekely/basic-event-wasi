import type { PrivateImpl } from "../types.js";
export interface WebAssemblyExceptionEventDetail {
    exception: any;
}
export declare class WebAssemblyExceptionEvent extends CustomEvent<WebAssemblyExceptionEventDetail> {
    constructor(impl: PrivateImpl, exception: any);
}
export declare function __throw_exception_with_stack_trace(this: PrivateImpl, ex: any): void;
