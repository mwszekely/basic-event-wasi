import { finalizeType } from "../_private/embind/finalize.js";
import { _embind_register } from "../_private/embind/register.js";
import type { InstantiatedWasm } from "../wasm.js";


export function _embind_register_float(this: InstantiatedWasm, typePtr: number, namePtr: number, _byteWidth: number): void {
    _embind_register(this, namePtr, (name) => {
        finalizeType<number, number>(this, name, {
            typeId: typePtr,
            fromWireType: (value) => ({ wireValue: value, jsValue: value}),
            toWireType: (value) => ({ wireValue: value, jsValue: value}),
        });
    });
}
