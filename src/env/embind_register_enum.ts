import { finalizeType, registerEmbound } from "../_private/embind/finalize.js";
import { _embind_register } from "../_private/embind/register.js";
import type { InstantiatedWasm } from "../wasm.js";

const AllEnums: Record<number, Record<string, number>> = {};

export function _embind_register_enum(this: InstantiatedWasm, typePtr: number, namePtr: number, _size: number, _isSigned: boolean): void {
    _embind_register(this, namePtr, (name) => {

        // Create the enum object that the user will inspect to look for enum values
        AllEnums[typePtr] = {};

        // Mark this type as ready to be used by other types 
        // (even if we don't have the enum values yet, enum values
        // themselves aren't used by any registration functions.)
        finalizeType<number, number>(this, name, {
            typeId: typePtr,
            fromWireType: (wireValue) => { return {wireValue, jsValue: wireValue}; },
            toWireType: (jsValue) => { return { wireValue: jsValue, jsValue } }
        });

        // Make this type available for the user
        registerEmbound(this, name as never, AllEnums[typePtr]);
    });
}


export function _embind_register_enum_value(this: InstantiatedWasm, rawEnumType: number, namePtr: number, enumValue: number): void {
    _embind_register(this, namePtr, (name) => {
        // Just add this name's value to the existing enum type.
        AllEnums[rawEnumType][name] = enumValue;
    })
}