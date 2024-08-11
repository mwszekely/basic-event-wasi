import { InstantiatedWasi } from "../../instantiated-wasi.js";
import { EmboundRegisteredType, WireConversionResult, WireTypes } from "./types.js";
export type CompositeElementRegistrationGetter<WT> = (getterContext: number, ptr: number) => WT;
export type CompositeElementRegistrationSetter<WT> = (setterContext: number, ptr: number, wireType: WT) => void;
export interface CompositeRegistrationInfo {
    namePtr: number;
    _constructor(): number;
    _destructor(ptr: WireTypes): void;
    elements: CompositeElementRegistrationInfo<any, any>[];
}
export interface CompositeElementRegistrationInfo<WT extends WireTypes, T> {
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
export interface CompositeElementRegistrationInfoE<WT extends WireTypes, T> extends CompositeElementRegistrationInfo<WT, T> {
    /** A version of `wasmGetter` that handles type conversion */
    read(ptr: WT): WireConversionResult<WT, T>;
    /** A version of `wasmSetter` that handles type conversion */
    write(ptr: number, value: T): WireConversionResult<WT, T>;
    /** `getterReturnTypeId, but resolved to the parsed type info */
    getterReturnType: EmboundRegisteredType<WT, T>;
    /** `setterReturnTypeId, but resolved to the parsed type info */
    setterArgumentType: EmboundRegisteredType<WT, T>;
}
export declare const compositeRegistrations: Record<number, CompositeRegistrationInfo>;
export declare function _embind_register_value_composite<T>(impl: InstantiatedWasi<{}>, rawTypePtr: number, namePtr: number, constructorSignature: number, rawConstructor: number, destructorSignature: number, rawDestructor: number): void;
export declare function _embind_finalize_composite_elements<I extends CompositeElementRegistrationInfoE<any, any>>(elements: CompositeElementRegistrationInfo<any, any>[]): Promise<I[]>;
//# sourceMappingURL=register-composite.d.ts.map