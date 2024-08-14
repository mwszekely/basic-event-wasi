import { _embind_register_std_string_any } from "../_private/embind/register-std-string.js";
import type { InstantiatedWasm } from "../wasm.js";

export function _embind_register_std_string(this: InstantiatedWasm, typePtr: number, namePtr: number): void {
    return _embind_register_std_string_any(this, typePtr, 1, namePtr);
}
