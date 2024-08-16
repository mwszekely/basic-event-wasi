import { getEnviron } from "../_private/environ.js";
import { ESUCCESS } from "../errno.js";
import { writeUint32 } from "../util/write-uint32.js";
import type { InstantiatedWasm } from "../wasm.js";


export function environ_sizes_get(this: InstantiatedWasm, environCountOutput: number, environSizeOutput: number): number {
    const { bufferSize, strings } = getEnviron(this);

    writeUint32(this, environCountOutput, strings.length);
    writeUint32(this, environSizeOutput, bufferSize);

    return ESUCCESS;
}
