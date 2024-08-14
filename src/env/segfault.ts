import { InstantiatedWasm } from "../wasm.js";

export class SegfaultError extends Error {
    constructor() {
        super("Segmentation fault");
    }
}

// Used by SAFE_HEAP
export function segfault(this: InstantiatedWasm): never {
    throw new SegfaultError();
}
