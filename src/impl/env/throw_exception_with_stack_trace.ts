import type { PrivateImpl } from "../../types.js";

export interface WebAssemblyExceptionEventDetail { exception: any }

export class WebAssemblyExceptionEvent extends CustomEvent<WebAssemblyExceptionEventDetail> {
    constructor(impl: PrivateImpl, exception: any) {
        super("WebAssemblyExceptionEvent", { cancelable: false, detail: { exception } })
    }
}

export function __throw_exception_with_stack_trace(this: PrivateImpl, ex: any) {
    this.dispatchEvent(new WebAssemblyExceptionEvent(this, ex));
}
