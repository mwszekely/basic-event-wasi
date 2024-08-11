import { finalizeType } from "../_private/embind/finalize.js";
import { _embind_register } from "../_private/embind/register.js";
import type { InstantiatedWasi } from "../instantiated-wasi.js";


export function _embind_register_void(this: InstantiatedWasi<{}>, rawTypePtr: number, namePtr: number): void {
    _embind_register(this, namePtr, name => {
        finalizeType<number, undefined>(this, name, {
            typeId: rawTypePtr,
            fromWireType: () => ({ jsValue: undefined!, wireValue: undefined! }),
            toWireType: () => ({ jsValue: undefined!, wireValue: undefined! })
        });
    })

}
