import "./custom_event.js";
export class AbortEvent extends CustomEvent {
    code;
    constructor(code) {
        super("AbortEvent", { bubbles: false, cancelable: false, detail: { code } });
        this.code = code;
    }
}
export class AbortError extends Error {
    constructor(code) {
        super(`abort(${code}) was called`);
    }
}
export function proc_exit(code) {
    this.dispatchEvent(new AbortEvent(code));
    throw new AbortError(code);
}
