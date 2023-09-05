export class WebAssemblyExceptionEvent extends CustomEvent {
    constructor(impl, exception) {
        super("WebAssemblyExceptionEvent", { cancelable: false, detail: { exception } });
    }
}
export function __throw_exception_with_stack_trace(ex) {
    this.dispatchEvent(new WebAssemblyExceptionEvent(this, ex));
}
