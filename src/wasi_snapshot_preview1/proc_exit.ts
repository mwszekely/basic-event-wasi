import type { InstantiatedWasi } from "../instantiated-wasi.js";

export interface AbortEventDetail {
    code: number;
}

export class AbortEvent extends CustomEvent<AbortEventDetail> {
    constructor(public code:number) {
        super("proc_exit", { bubbles: false, cancelable: false, detail: { code } });
    }
    
}

export class AbortError extends Error {
    constructor(code: number) {
        super(`abort(${code}) was called`);
    }
}

export function proc_exit(this: InstantiatedWasi<{}>, code: number): void {
    this.dispatchEvent(new AbortEvent(code));
    throw new AbortError(code);
}
