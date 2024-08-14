
import { registerEmbound } from "../_private/embind/finalize.js";
import { getTypeInfo } from "../_private/embind/get-type-info.js";
import { _embind_register } from "../_private/embind/register.js";
import type { EmboundRegisteredType, WireTypes } from "../_private/embind/types.js";
import type { InstantiatedWasm } from "../wasm.js";


export function _embind_register_constant<WT extends WireTypes, T>(this: InstantiatedWasm, namePtr: number, typePtr: number, valueAsWireType: WT): void {


    _embind_register(this, namePtr, async (constName) => {
        // Wait until we know how to parse the type this constant references.
        const [type] = await getTypeInfo<[EmboundRegisteredType<WT, T>]>(typePtr);

        // Convert the constant from its wire representation to its JS representation.
        const value = type.fromWireType(valueAsWireType);

        // Add this constant value to the `embind` object.
        registerEmbound<T>(this, constName, value.jsValue);
    });
}


