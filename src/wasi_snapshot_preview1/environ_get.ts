import { getEnviron } from "../_private/environ.js";
import { ESUCCESS } from "../errno.js";
import { copyToWasm } from "../util/copy-to-wasm.js";
import { getPointerSize } from "../util/pointer.js";
import { writePointer } from "../util/write-pointer.js";
import type { InstantiatedWasm } from "../wasm.js";

export function environ_get(this: InstantiatedWasm, environ: number, environBuffer: number): number {
    const { strings } = getEnviron(this);

    let currentBufferPtr = environBuffer;
    let currentEnvironPtr = environ;
    for (const string of strings) {
        writePointer(this, currentEnvironPtr, currentBufferPtr);
        copyToWasm(this, currentBufferPtr, string);
        currentBufferPtr += string.byteLength + 1;
        currentEnvironPtr += getPointerSize(this);
    }

    return ESUCCESS;
}
