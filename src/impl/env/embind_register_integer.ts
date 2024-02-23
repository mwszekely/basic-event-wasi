import { PrivateImpl } from "../../types.js";
import { readLatin1String } from "../../util.js";

export function _embind_register_integer(this: PrivateImpl, primitiveType: number, name: number, size: number, minRange: number, maxRange: number) {
    console.log(`_embind_register_integer(${readLatin1String(this.instance, primitiveType)}, ${readLatin1String(this.instance, name)}, ${size}, ${minRange}, ${maxRange})`);
    debugger;
}
