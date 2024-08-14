import type { InstantiatedWasm } from "../wasm.js";
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
export declare function proc_exit(this: InstantiatedWasm, code: number): void;
//# sourceMappingURL=proc_exit.d.ts.map