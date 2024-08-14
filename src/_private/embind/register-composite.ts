import { InstantiatedWasm } from "../../wasm.js";
import { getTableFunction } from "./get-table-function.js";
import { getTypeInfo } from "./get-type-info.js";
import type { EmboundRegisteredType, WireConversionResult, WireTypes } from "./types.js";

export type CompositeElementRegistrationGetter<WT> = (getterContext: number, ptr: number) => WT;
export type CompositeElementRegistrationSetter<WT> = (setterContext: number, ptr: number, wireType: WT) => void;

export interface CompositeRegistrationInfo<WT extends WireTypes> {
    namePtr: number;
    _constructor(): number;
    _destructor(ptr: WT): void;
    elements: CompositeElementRegistrationInfo<WT>[];
}

export interface CompositeElementRegistrationInfo<WT extends WireTypes> {

    /** The "raw" getter, exported from Embind. Needs conversion between types. */
    wasmGetter: CompositeElementRegistrationGetter<WT>;

    /** The "raw" setter, exported from Embind. Needs conversion between types. */
    wasmSetter: CompositeElementRegistrationSetter<WT>;

    /** The numeric type ID of the type the getter returns */
    getterReturnTypeId: number;

    /** The numeric type ID of the type the setter accepts */
    setterArgumentTypeId: number;

    /** Unknown; used as an argument to the embind getter */
    getterContext: number;

    /** Unknown; used as an argument to the embind setter */
    setterContext: number;
}

export interface CompositeElementRegistrationInfoE<WT extends WireTypes, T> extends CompositeElementRegistrationInfo<WT> {
    /** A version of `wasmGetter` that handles type conversion */
    read(ptr: WT): WireConversionResult<WT, T>;

    /** A version of `wasmSetter` that handles type conversion */
    write(ptr: number, value: T): WireConversionResult<WT, T>;

    /** `getterReturnTypeId, but resolved to the parsed type info */
    getterReturnType: EmboundRegisteredType<WT, T>;

    /** `setterReturnTypeId, but resolved to the parsed type info */
    setterArgumentType: EmboundRegisteredType<WT, T>;
}

// Temporary scratch memory to communicate between registration calls.
export const compositeRegistrations: Map<number, CompositeRegistrationInfo<WireTypes>> = new Map();




export function _embind_register_value_composite(impl: InstantiatedWasm, rawTypePtr: number, namePtr: number, constructorSignature: number, rawConstructor: number, destructorSignature: number, rawDestructor: number): void {
    compositeRegistrations.set(rawTypePtr, {
        namePtr,
        _constructor: getTableFunction<CompositeRegistrationInfo<WireTypes>["_constructor"]>(impl, constructorSignature, rawConstructor),
        _destructor: getTableFunction<CompositeRegistrationInfo<WireTypes>["_destructor"]>(impl, destructorSignature, rawDestructor),
        elements: [],
    });

}



export async function _embind_finalize_composite_elements<I extends CompositeElementRegistrationInfoE<WireTypes, unknown>>(elements: CompositeElementRegistrationInfo<WireTypes>[]): Promise<I[]> {
    const dependencyIds = [...elements.map((elt) => elt.getterReturnTypeId), ...elements.map((elt) => elt.setterArgumentTypeId)];

    const dependencies = await getTypeInfo(...dependencyIds);
    console.assert(dependencies.length == elements.length * 2);

    const fieldRecords = elements.map((field, i): CompositeElementRegistrationInfoE<WireTypes, unknown> => {
        const getterReturnType = dependencies[i]!;
        const setterArgumentType = dependencies[i + elements.length]!;

        function read(ptr: number) {
            return getterReturnType.fromWireType(field.wasmGetter(field.getterContext, ptr));
        }
        function write(ptr: number, o: unknown) {
            const ret = setterArgumentType.toWireType(o);
            field.wasmSetter(field.setterContext, ptr, ret.wireValue);
            return ret;

        }
        return {
            getterReturnType,
            setterArgumentType,
            read,
            write,
            ...field
        }
    });

    return fieldRecords as I[];
}