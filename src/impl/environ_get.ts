import { Pointer, PrivateImpl } from "../types.js";

export function environ_get(this: PrivateImpl, environCountOutput: Pointer<Pointer<number>>, environSizeOutput: Pointer<number>) {
    this.writeUint32(environCountOutput, 0);
    this.writeUint32(environSizeOutput, 0);

    return 0;
}
