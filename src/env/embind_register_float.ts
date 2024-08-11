import { finalizeType } from "../_private/embind/finalize.js";
import { _embind_register } from "../_private/embind/register.js";
import type { InstantiatedWasi } from "../instantiated-wasi.js";


export function _embind_register_float(this: InstantiatedWasi<{}>, typePtr: number, namePtr: number, byteWidth: number): void {
    _embind_register(this, namePtr, async (name) => {
        finalizeType<number, number>(this, name, {
            typeId: typePtr,
            fromWireType: (value) => ({ wireValue: value, jsValue: value}),
            toWireType: (value) => ({ wireValue: value, jsValue: value}),
        });
    });
}
