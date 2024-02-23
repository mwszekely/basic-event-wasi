import { PrivateImpl } from "../../types.js";
import { readLatin1String } from "../../util.js";

export function _embind_register_std_string(this: PrivateImpl, rawType: number, name: number) {
    console.log(`_embind_register_std_string(${readLatin1String(this.instance, rawType)}, ${readLatin1String(this.instance, name)})`);
    debugger;
}
