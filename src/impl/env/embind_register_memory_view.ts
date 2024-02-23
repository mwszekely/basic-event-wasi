import { PrivateImpl } from "../../types.js";
import { readLatin1String } from "../../util.js";

export function _embind_register_memory_view(this: PrivateImpl, rawType: number, dataTypeIndex: number, name: number) {
    console.log(`_embind_register_memory_view(${readLatin1String(this.instance, rawType)}, ${dataTypeIndex}, ${readLatin1String(this.instance, name)})`);
    debugger;
}
