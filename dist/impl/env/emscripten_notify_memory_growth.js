import "../custom_event.js";
export class MemoryGrowthEvent extends CustomEvent {
    constructor(impl, index) {
        super("MemoryGrowthEvent", { cancelable: false, detail: { index } });
    }
}
export function emscripten_notify_memory_growth(index) {
    this.dispatchEvent(new MemoryGrowthEvent(this, index));
}
