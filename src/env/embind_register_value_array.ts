import { runDestructors } from "../_private/embind/destructors.js";
import { finalizeType } from "../_private/embind/finalize.js";
import { getTableFunction } from "../_private/embind/get-table-function.js";
import { _embind_finalize_composite_elements, _embind_register_value_composite, CompositeElementRegistrationGetter, CompositeElementRegistrationInfo, CompositeElementRegistrationInfoE, CompositeElementRegistrationSetter, CompositeRegistrationInfo, compositeRegistrations } from "../_private/embind/register-composite.js";
import { _embind_register } from "../_private/embind/register.js";
import { WireTypes } from "../_private/embind/types.js";
import type { InstantiatedWasi } from "../instantiated-wasi.js";




interface ArrayRegistrationInfo extends CompositeRegistrationInfo { }
interface ArrayElementRegistrationInfo<WT extends WireTypes, T> extends CompositeElementRegistrationInfo<WT, T> { }
interface ArrayElementRegistrationInfoE<WT extends WireTypes, T> extends ArrayElementRegistrationInfo<WT, T>, CompositeElementRegistrationInfoE<WT, T> { }



export function _embind_register_value_array<T>(this: InstantiatedWasi<{}>, rawTypePtr: number, namePtr: number, constructorSignature: number, rawConstructor: number, destructorSignature: number, rawDestructor: number): void {
    _embind_register_value_composite<T>(this, rawTypePtr, namePtr, constructorSignature, rawConstructor, destructorSignature, rawDestructor);

}


export function _embind_register_value_array_element<T>(this: InstantiatedWasi<{}>, rawTupleType: number, getterReturnTypeId: number, getterSignature: number, getter: number, getterContext: number, setterArgumentTypeId: number, setterSignature: number, setter: number, setterContext: number): void {
    compositeRegistrations[rawTupleType].elements.push({
        getterContext,
        setterContext,
        getterReturnTypeId,
        setterArgumentTypeId,
        wasmGetter: getTableFunction<CompositeElementRegistrationGetter<T>>(this, getterSignature, getter),
        wasmSetter: getTableFunction<CompositeElementRegistrationSetter<T>>(this, setterSignature, setter)
    });
}

export function _embind_finalize_value_array<T>(this: InstantiatedWasi<{}>, rawTypePtr: number): void {
    const reg = compositeRegistrations[rawTypePtr];
    delete compositeRegistrations[rawTypePtr];

    _embind_register(this, reg.namePtr, async (name) => {

        const fieldRecords = await _embind_finalize_composite_elements<ArrayElementRegistrationInfoE<any, T>>(reg.elements);


        finalizeType<any, unknown[]>(this, name, {
            typeId: rawTypePtr,
            fromWireType: (ptr) => {
                let elementDestructors: Array<() => void> = []
                const ret: (any[] & Disposable) = [] as any;

                for (let i = 0; i < reg.elements.length; ++i) {
                    const field = fieldRecords[i];
                    const { jsValue, wireValue, stackDestructor } = fieldRecords[i].read(ptr);
                    elementDestructors.push(() => stackDestructor?.(jsValue, wireValue));
                    ret[i] = jsValue;
                }
                ret[Symbol.dispose] = () => {
                    runDestructors(elementDestructors);
                    reg._destructor(ptr)
                }

                Object.freeze(ret);

                return {
                    jsValue: ret,
                    wireValue: ptr,
                    stackDestructor: () => ret[Symbol.dispose]()
                };
            },
            toWireType: (o) => {
                let elementDestructors: Array<() => void> = []
                const ptr = reg._constructor();
                let i = 0;
                for (let field of fieldRecords) {
                    const { jsValue, wireValue, stackDestructor } = field.write(ptr, o[i] as any);
                    elementDestructors.push(() => stackDestructor?.(jsValue, wireValue));
                    ++i;
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
