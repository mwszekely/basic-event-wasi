import { PrivateImpl } from "../../types.js";
import { readLatin1String } from "../../util.js";

export function _embind_register_std_wstring(this: PrivateImpl, rawType: number, charSize: number, name: number) {
    console.log(`_embind_register_std_wstring(${readLatin1String(this.instance, rawType)}, ${charSize}, ${readLatin1String(this.instance, name)})`);
    debugger;
}
