import { PrivateImpl } from "../../types.js";
import "./custom_event.js";
export interface AbortEventDetail {
    code: number;
}
export declare class AbortEvent extends CustomEvent<AbortEventDetail> {
    code: number;
    constructor(code: number);
}
export declare class AbortError extends Error {
    constructor(code: number);
}
export declare function proc_exit(this: PrivateImpl, code: number): void;
