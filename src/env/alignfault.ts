import { InstantiatedWasm } from "../wasm.js";

export class AlignfaultError extends Error {
    constructor() {
        super("Alignment fault");
    }
}

// Used by SAFE_HEAP
export function alignfault(this: InstantiatedWasm): never {
    throw new AlignfaultError();
}
