import type { InstantiatedWasm } from "../wasm.js";
export interface EnvironGetEventDetail {
    /**
     * A list of environment variable tuples; a key and a value.
     * This array is mutable; when event dispatch ends, the final
     * value of this array will be used to populate environment variables.
     */
    strings: [key: string, value: string][];
}
export declare class EnvironGetEvent extends CustomEvent<EnvironGetEventDetail> {
    constructor();
}
export interface EnvironInfo {
    bufferSize: number;
    strings: Uint8Array[];
}
export declare function getEnviron(impl: InstantiatedWasm): EnvironInfo;
//# sourceMappingURL=environ.d.ts.map