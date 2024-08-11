import { _embind_register_std_string_any } from "../_private/embind/register-std-string.js";
import type { InstantiatedWasi } from "../instantiated-wasi.js";

export function _embind_register_std_wstring(this: InstantiatedWasi<{}>, typePtr: number, charWidth: 2 | 4, namePtr: number): void {
    return _embind_register_std_string_any(this, typePtr, charWidth, namePtr);
}
