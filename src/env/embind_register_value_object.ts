import { runDestructors } from "../_private/embind/destructors.js";
import { finalizeType } from "../_private/embind/finalize.js";
import { getTableFunction } from "../_private/embind/get-table-function.js";
import { _embind_finalize_composite_elements, CompositeElementRegistrationGetter, CompositeElementRegistrationInfo, CompositeElementRegistrationInfoE, CompositeElementRegistrationSetter, CompositeRegistrationInfo, compositeRegistrations } from "../_private/embind/register-composite.js";
import { _embind_register } from "../_private/embind/register.js";
import { WireTypes } from "../_private/embind/types.js";
import { readLatin1String } from "../_private/string.js";
import { InstantiatedWasi } from "../instantiated-wasi.js";

interface StructRegistrationInfo extends CompositeRegistrationInfo {
    elements: StructFieldRegistrationInfo<any, any>[];
}

interface StructFieldRegistrationInfo<WT extends WireTypes, T> extends CompositeElementRegistrationInfo<WT, T> {
    /** The name of this field */
    name: string;
}

interface StructFieldRegistrationInfoE<WT extends WireTypes, T> extends StructFieldRegistrationInfo<WT, T>, CompositeElementRegistrationInfoE<WT, T> { }

/**
 * This function is called first, to start the registration of a struct and all its fields. 
 */
export function _embind_register_value_object(this: InstantiatedWasi<{}>, rawType: number, namePtr: number, constructorSignature: number, rawConstructor: number, destructorSignature: number, rawDestructor: number): void {
    compositeRegistrations[rawType] = {
        namePtr,
        _constructor: getTableFunction<() => number>(this, constructorSignature, rawConstructor),
        _destructor: getTableFunction<() => void>(this, destructorSignature, rawDestructor),
        elements: [],
    };
}

/**
 * This function is called once per field, after `_embind_register_value_object` and before `_embind_finalize_value_object`.
 */
export function _embind_register_value_object_field<T>(this: InstantiatedWasi<{}>, rawTypePtr: number, fieldName: number, getterReturnTypeId: number, getterSignature: number, getter: number, getterContext: number, setterArgumentTypeId: number, setterSignature: number, setter: number, setterContext: number): void {
    (compositeRegistrations[rawTypePtr] as StructRegistrationInfo).elements.push({
        name: readLatin1String(this, fieldName),
        getterContext,
        setterContext,
        getterReturnTypeId,
        setterArgumentTypeId,
        wasmGetter: getTableFunction<CompositeElementRegistrationGetter<T>>(this, getterSignature, getter),
        wasmSetter: getTableFunction<CompositeElementRegistrationSetter<T>>(this, setterSignature, setter),
    });
}

/**
 * Called after all other object registration functions are called; this contains the actual registration code.
 */
export function _embind_finalize_value_object<T>(this: InstantiatedWasi<{}>, rawTypePtr: number): void {
    const reg = compositeRegistrations[rawTypePtr];
    delete compositeRegistrations[rawTypePtr];

    _embind_register(this, reg.namePtr, async (name) => {

        const fieldRecords = await _embind_finalize_composite_elements<StructFieldRegistrationInfoE<any, T>>(reg.elements);

        finalizeType(this, name, {
            typeId: rawTypePtr,
            fromWireType: (ptr) => {
                let elementDestructors: Array<() => void> = []
                const ret: Disposable = {} as any;
                Object.defineProperty(ret, Symbol.dispose, {
                    value: () => {
                        runDestructors(elementDestructors);
                        reg._destructor(ptr);
                    },
                    enumerable: false,
                    writable: false
                });

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
                        ret[Symbol.dispose]();
                    }
                };
            },
            toWireType: (o) => {
                const ptr = reg._constructor();
                let elementDestructors: Array<() => void> = []
                for (let field of fieldRecords) {
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

