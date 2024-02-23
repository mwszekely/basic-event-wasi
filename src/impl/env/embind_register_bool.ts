import { PrivateImpl } from "../../types.js";
import { readLatin1String } from "../../util.js";

export function _embind_register_bool(this: PrivateImpl, rawType: number, name: number, trueValue: number = 1, falseValue: number = 0) {
    console.log(`_embind_register_bool(${readLatin1String(this.instance, rawType)}, ${readLatin1String(this.instance, name)}, ${trueValue}, ${falseValue})`);
    debugger;
}
