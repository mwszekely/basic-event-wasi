import { runDestructors } from "../_private/embind/destructors.js";
import { finalizeType } from "../_private/embind/finalize.js";
import { getTableFunction } from "../_private/embind/get-table-function.js";
import { _embind_finalize_composite_elements, _embind_register_value_composite, type CompositeElementRegistrationGetter, type CompositeElementRegistrationInfo, type CompositeElementRegistrationInfoE, type CompositeElementRegistrationSetter, compositeRegistrations } from "../_private/embind/register-composite.js";
import { _embind_register } from "../_private/embind/register.js";
import type { WireTypes } from "../_private/embind/types.js";
import type { InstantiatedWasm } from "../wasm.js";

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface ArrayElementRegistrationInfo<WT extends WireTypes> extends CompositeElementRegistrationInfo<WT> { }
interface ArrayElementRegistrationInfoE<WT extends WireTypes, T> extends ArrayElementRegistrationInfo<WT>, CompositeElementRegistrationInfoE<WT, T> { }

export function _embind_register_value_array(this: InstantiatedWasm, rawTypePtr: number, namePtr: number, constructorSignature: number, rawConstructor: number, destructorSignature: number, rawDestructor: number): void {
    _embind_register_value_composite(this, rawTypePtr, namePtr, constructorSignature, rawConstructor, destructorSignature, rawDestructor);

}


export function _embind_register_value_array_element(this: InstantiatedWasm, rawTupleType: number, getterReturnTypeId: number, getterSignature: number, getter: number, getterContext: number, setterArgumentTypeId: number, setterSignature: number, setter: number, setterContext: number): void {
    compositeRegistrations.get(rawTupleType)!.elements.push({
        getterContext,
        setterContext,
        getterReturnTypeId,
        setterArgumentTypeId,
        wasmGetter: getTableFunction<CompositeElementRegistrationGetter<WireTypes>>(this, getterSignature, getter),
        wasmSetter: getTableFunction<CompositeElementRegistrationSetter<WireTypes>>(this, setterSignature, setter)
    });
}

export function _embind_finalize_value_array(this: InstantiatedWasm, rawTypePtr: number): void {
    const reg = compositeRegistrations.get(rawTypePtr)!;
    compositeRegistrations.delete(rawTypePtr);

    _embind_register(this, reg.namePtr, async (name) => {

        const fieldRecords = await _embind_finalize_composite_elements<ArrayElementRegistrationInfoE<WireTypes, unknown>>(reg.elements);


        finalizeType<WireTypes, unknown[]>(this, name, {
            typeId: rawTypePtr,
            fromWireType: (ptr) => {
                const elementDestructors: (() => void)[] = []
                const ret: (unknown[]) = [];

                for (let i = 0; i < reg.elements.length; ++i) {
                    const { jsValue, wireValue, stackDestructor } = fieldRecords[i].read(ptr);
                    elementDestructors.push(() => stackDestructor?.(jsValue, wireValue));
                    ret[i] = jsValue;
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
                const elementDestructors: (() => void)[] = []
                const ptr = reg._constructor();
                let i = 0;
                for (const field of fieldRecords) {
                    const { jsValue, wireValue, stackDestructor } = field.write(ptr, o[i]);
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
