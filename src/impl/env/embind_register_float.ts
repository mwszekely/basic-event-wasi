import { PrivateImpl } from "../../types.js";
import { readLatin1String } from "../../util.js";

export function _embind_register_float(this: PrivateImpl, primitiveType: number, name: number, size: number) {
    console.log(`_embind_register_float(${readLatin1String(this.instance, primitiveType)}, ${readLatin1String(this.instance, name)}, ${size})`);
    debugger;
}
