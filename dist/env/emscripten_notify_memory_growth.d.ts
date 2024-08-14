import type { InstantiatedWasm } from "../wasm.js";
export interface MemoryGrowthEventDetail {
    index: number;
}
export declare class MemoryGrowthEvent extends CustomEvent<MemoryGrowthEventDetail> {
    constructor(_impl: InstantiatedWasm, index: number);
}
export declare function emscripten_notify_memory_growth(this: InstantiatedWasm, index: number): void;
//# sourceMappingURL=emscripten_notify_memory_growth.d.ts.map