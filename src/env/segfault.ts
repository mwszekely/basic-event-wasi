import { InstantiatedWasi } from "../instantiated-wasi.js";

export class SegfaultError extends Error {
    constructor() {
        super("Segmentation fault");
    }
}

// Used by SAFE_HEAP
export function segfault(this: InstantiatedWasi<{}>): never {
    throw new SegfaultError();
}
