import type { PrivateImpl } from "../../types.js";
export interface MemoryGrowthEventDetail {
    index: number;
}
export declare class MemoryGrowthEvent extends CustomEvent<MemoryGrowthEventDetail> {
    constructor(impl: PrivateImpl, index: number);
}
export declare function emscripten_notify_memory_growth(this: PrivateImpl, index: number): void;
