import { PrivateImpl } from "../types.js";

export interface AbortEventDetail {
    code: number;
}

export class AbortEvent extends CustomEvent<AbortEventDetail> {
    constructor(public code:number) {
        super("AbortEvent", { bubbles: false, cancelable: false, detail: { code } });
    }
    
}

export class AbortError extends Error {
    constructor(code: number) {
        super(`abort(${code}) was called`);
    }
}

export function proc_exit(this: PrivateImpl, code: number) {
    this.dispatchEvent(new AbortEvent(code));
    throw new AbortError(code);
}
