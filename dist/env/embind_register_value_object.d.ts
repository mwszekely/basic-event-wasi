import { InstantiatedWasi } from "../instantiated-wasi.js";
/**
 * This function is called first, to start the registration of a struct and all its fields.
 */
export declare function _embind_register_value_object(this: InstantiatedWasi<{}>, rawType: number, namePtr: number, constructorSignature: number, rawConstructor: number, destructorSignature: number, rawDestructor: number): void;
/**
 * This function is called once per field, after `_embind_register_value_object` and before `_embind_finalize_value_object`.
 */
export declare function _embind_register_value_object_field<T>(this: InstantiatedWasi<{}>, rawTypePtr: number, fieldName: number, getterReturnTypeId: number, getterSignature: number, getter: number, getterContext: number, setterArgumentTypeId: number, setterSignature: number, setter: number, setterContext: number): void;
/**
 * Called after all other object registration functions are called; this contains the actual registration code.
 */
export declare function _embind_finalize_value_object<T>(this: InstantiatedWasi<{}>, rawTypePtr: number): void;
//# sourceMappingURL=embind_register_value_object.d.ts.map