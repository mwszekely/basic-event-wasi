import type { InstantiatedWasi } from "../instantiated-wasi.js";
export interface MemoryGrowthEventDetail {
    index: number;
}
export declare class MemoryGrowthEvent extends CustomEvent<MemoryGrowthEventDetail> {
    constructor(impl: InstantiatedWasi<{}>, index: number);
}
export declare function emscripten_notify_memory_growth(this: InstantiatedWasi<{}>, index: number): void;
//# sourceMappingURL=emscripten_notify_memory_growth.d.ts.map