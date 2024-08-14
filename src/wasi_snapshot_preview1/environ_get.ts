import type { Pointer } from "../types.js";
import { writeUint32 } from "../util/write-uint32.js";
import type { InstantiatedWasm } from "../wasm.js";

export function environ_get(this: InstantiatedWasm, environCountOutput: Pointer<Pointer<number>>, environSizeOutput: Pointer<number>) {
    writeUint32(this, environCountOutput, 0);
    writeUint32(this, environSizeOutput, 0);

    return 0;
}
