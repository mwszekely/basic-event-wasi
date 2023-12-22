import { writeUint32 } from "../../util.js";
export function environ_sizes_get(environCountOutput, environSizeOutput) {
    writeUint32(this.instance, environCountOutput, 0);
    writeUint32(this.instance, environSizeOutput, 0);
    return 0;
}
