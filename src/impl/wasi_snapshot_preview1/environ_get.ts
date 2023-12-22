import { Pointer, PrivateImpl } from "../../types.js";
import { writeUint32 } from "../../util.js";

export function environ_get(this: PrivateImpl, environCountOutput: Pointer<Pointer<number>>, environSizeOutput: Pointer<number>) {
    writeUint32(this.instance, environCountOutput, 0);
    writeUint32(this.instance, environSizeOutput, 0);

    return 0;
}
