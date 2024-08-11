import type { InstantiatedWasi } from "../instantiated-wasi.js";

export interface MemoryGrowthEventDetail { index: number }

export class MemoryGrowthEvent extends CustomEvent<MemoryGrowthEventDetail> {
    constructor(impl: InstantiatedWasi<{}>, index: number) {
        super("MemoryGrowthEvent", { cancelable: false, detail: { index } })
    }
}

export function emscripten_notify_memory_growth(this: InstantiatedWasi<{}>, index: number): void {
    this.cachedMemoryView = new DataView(this.exports.memory.buffer);
    this.dispatchEvent(new MemoryGrowthEvent(this, index));
}
