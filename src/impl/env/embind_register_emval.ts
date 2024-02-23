import { PrivateImpl } from "../../types.js";
import { readLatin1String } from "../../util.js";

export function _embind_register_emval(this: PrivateImpl, rawType: number) {
    console.log(`_embind_register_emval(${readLatin1String(this.instance, rawType)})`);
    debugger;
}
