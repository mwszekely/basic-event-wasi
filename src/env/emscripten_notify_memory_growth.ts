import type { InstantiatedWasm } from "../wasm.js";

export interface MemoryGrowthEventDetail { index: number }

export class MemoryGrowthEvent extends CustomEvent<MemoryGrowthEventDetail> {
    constructor(_impl: InstantiatedWasm, index: number) {
        super("MemoryGrowthEvent", { cancelable: false, detail: { index } })
    }
}

export function emscripten_notify_memory_growth(this: InstantiatedWasm, index: number): void {
    this.cachedMemoryView = new DataView(this.exports.memory.buffer);
    this.dispatchEvent(new MemoryGrowthEvent(this, index));
}
