import { InstantiatedWasi } from "../instantiated-wasi.js";

export class AlignfaultError extends Error {
    constructor() {
        super("Alignment fault");
    }
}

// Used by SAFE_HEAP
export function alignfault(this: InstantiatedWasi<{}>): never {
    throw new AlignfaultError();
}
