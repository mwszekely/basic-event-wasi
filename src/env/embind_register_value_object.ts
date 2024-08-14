import { runDestructors } from "../_private/embind/destructors.js";
import { finalizeType } from "../_private/embind/finalize.js";
import { getTableFunction } from "../_private/embind/get-table-function.js";
import { _embind_finalize_composite_elements, compositeRegistrations, type CompositeElementRegistrationGetter, type CompositeElementRegistrationInfo, type CompositeElementRegistrationInfoE, type CompositeElementRegistrationSetter, type CompositeRegistrationInfo } from "../_private/embind/register-composite.js";
import { _embind_register } from "../_private/embind/register.js";
import type { WireTypes } from "../_private/embind/types.js";
import { readLatin1String } from "../_private/string.js";
import { InstantiatedWasm } from "../wasm.js";

interface StructRegistrationInfo<WT extends WireTypes> extends CompositeRegistrationInfo<WT> {
    elements: StructFieldRegistrationInfo<WT>[];
}

interface StructFieldRegistrationInfo<WT extends WireTypes> extends CompositeElementRegistrationInfo<WT> {
    /** The name of this field */
    name: string;
}

interface StructFieldRegistrationInfoE<WT extends WireTypes, T> extends StructFieldRegistrationInfo<WT>, CompositeElementRegistrationInfoE<WT, T> { }

/**
 * This function is called first, to start the registration of a struct and all its fields. 
 */
export function _embind_register_value_object(this: InstantiatedWasm, rawType: number, namePtr: number, constructorSignature: number, rawConstructor: number, destructorSignature: number, rawDestructor: number): void {
    compositeRegistrations.set(rawType, {
        namePtr,
        _constructor: getTableFunction<() => number>(this, constructorSignature, rawConstructor),
        _destructor: getTableFunction<() => void>(this, destructorSignature, rawDestructor),
        elements: [],
    });
}

/**
 * This function is called once per field, after `_embind_register_value_object` and before `_embind_finalize_value_object`.
 */
export function _embind_register_value_object_field(this: InstantiatedWasm, rawTypePtr: number, fieldName: number, getterReturnTypeId: number, getterSignature: number, getter: number, getterContext: number, setterArgumentTypeId: number, setterSignature: number, setter: number, setterContext: number): void {
    (compositeRegistrations.get(rawTypePtr) as StructRegistrationInfo<WireTypes>).elements.push({
        name: readLatin1String(this, fieldName),
        getterContext,
        setterContext,
        getterReturnTypeId,
        setterArgumentTypeId,
        wasmGetter: getTableFunction<CompositeElementRegistrationGetter<WireTypes>>(this, getterSignature, getter),
        wasmSetter: getTableFunction<CompositeElementRegistrationSetter<WireTypes>>(this, setterSignature, setter),
    });
}

/**
 * Called after all other object registration functions are called; this contains the actual registration code.
 */
export function _embind_finalize_value_object(this: InstantiatedWasm, rawTypePtr: number): void {
    const reg = compositeRegistrations.get(rawTypePtr)!;
    compositeRegistrations.delete(rawTypePtr);

    _embind_register(this, reg.namePtr, async (name) => {

        const fieldRecords = await _embind_finalize_composite_elements<StructFieldRegistrationInfoE<WireTypes, unknown>>(reg.elements);

        finalizeType(this, name, {
            typeId: rawTypePtr,
            fromWireType: (ptr) => {
                const elementDestructors: (() => void)[] = []
                const ret = {};

                for (let i = 0; i < reg.elements.length; ++i) {
                    const field = fieldRecords[i];
                    const { jsValue, wireValue, stackDestructor } = fieldRecords[i].read(ptr);
                    elementDestructors.push(() => stackDestructor?.(jsValue, wireValue));
                    Object.defineProperty(ret, field.name, {
                        value: jsValue,
                        writable: false,
                        configurable: false,
                        enumerable: true,
                    })
                }

                Object.freeze(ret);

                return {
                    jsValue: ret,
                    wireValue: ptr,
                    stackDestructor: () => {
                        runDestructors(elementDestructors);
                        reg._destructor(ptr);
                    }
                };
            },
            toWireType: (o) => {
                const ptr = reg._constructor();
                const elementDestructors: (() => void)[] = []
                for (const field of fieldRecords) {
                    const { jsValue, wireValue, stackDestructor } = field.write(ptr, o[field.name as never]);
                    elementDestructors.push(() => stackDestructor?.(jsValue, wireValue));
                }
                return {
                    wireValue: ptr,
                    jsValue: o,
                    stackDestructor: () => {
                        runDestructors(elementDestructors);
                        reg._destructor(ptr)
                    }
                };
            }
        });

    });
}

