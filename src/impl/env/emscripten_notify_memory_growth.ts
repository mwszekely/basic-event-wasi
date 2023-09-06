import type { PrivateImpl } from "../../types.js";
import "../custom_event.js";

export interface MemoryGrowthEventDetail { index: number }

export class MemoryGrowthEvent extends CustomEvent<MemoryGrowthEventDetail> {
    constructor(impl: PrivateImpl, index: number) {
        super("MemoryGrowthEvent", { cancelable: false, detail: { index } })
    }
}

export function emscripten_notify_memory_growth(this: PrivateImpl, index: number) {
    this.dispatchEvent(new MemoryGrowthEvent(this, index));
}
