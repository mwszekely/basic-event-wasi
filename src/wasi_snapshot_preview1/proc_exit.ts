import type { InstantiatedWasm } from "../wasm.js";


export interface ProcExitEventDetail {
    /** 
     * The value passed to `std::exit` 
     * (and/or the value returned from `main`) 
     */
    readonly code: number;
}

/**
 * This event is called when `std::exit` is called, including when
 * `main` ends, if you have one.
 * 
 * What you choose to do with this event is up to you, but
 * know that the next WASM instruction once event dispatch ends is `unreachable`.
 * 
 * It's recommended to throw your own `Error`, which is what Emscripten does.
 */
export class ProcExitEvent extends CustomEvent<ProcExitEventDetail> {
    constructor(public code: number) {
        super("proc_exit", { bubbles: false, cancelable: false, detail: { code } });
    }
}

export function proc_exit(this: InstantiatedWasm, code: number): void {
    this.dispatchEvent(new ProcExitEvent(code));
}
