
import { finalizeType } from "../_private/embind/finalize.js";
import { _embind_register } from "../_private/embind/register.js";
import type { InstantiatedWasi } from "../instantiated-wasi.js";


export function _embind_register_bool(this: InstantiatedWasi<{}>, rawTypePtr: number, namePtr: number, trueValue: 1, falseValue: 0): void {
    _embind_register(this, namePtr, name => {

        finalizeType<number | boolean, boolean>(this, name, {
            typeId: rawTypePtr,
            fromWireType: (wireValue) => { return { jsValue: !!wireValue, wireValue }; },
            toWireType: (o) => { return { wireValue: o ? trueValue : falseValue, jsValue: o }; },
        })
    })
}
