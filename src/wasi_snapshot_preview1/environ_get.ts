import type { InstantiatedWasi } from "../instantiated-wasi.js";
import type { Pointer } from "../types.js";
import { writeUint32 } from "../util/write-uint32.js";

export function environ_get(this: InstantiatedWasi<{}>, environCountOutput: Pointer<Pointer<number>>, environSizeOutput: Pointer<number>) {
    writeUint32(this, environCountOutput, 0);
    writeUint32(this, environSizeOutput, 0);

    return 0;
}
