import { createGlueFunction } from "../_private/embind/create-glue-function.js";
import { EmboundClasses } from "../_private/embind/embound-class.js";
import { _embind_register } from "../_private/embind/register.js";
import { InstantiatedWasm } from "../wasm.js";


export function _embind_register_class_property(
    this: InstantiatedWasm,
    rawClassTypeId: number,
    fieldNamePtr: number,
    getterReturnTypeId: number,
    getterSignaturePtr: number,
    getterIndex: number,
    getterContext: number,
    setterArgumentTypeId: number,
    setterSignaturePtr: number,
    setterIndex: number,
    setterContext: number
): void {

    _embind_register(this, fieldNamePtr, async (name) => {

        const get = await createGlueFunction<() => unknown>(this, `${name}_getter`, getterReturnTypeId, [], getterSignaturePtr, getterIndex, getterContext);
        const set = setterIndex ? await createGlueFunction<(value: unknown) => void>(this, `${name}_setter`, 0, [setterArgumentTypeId], setterSignaturePtr, setterIndex, setterContext) : undefined;

        Object.defineProperty((EmboundClasses[rawClassTypeId].prototype as unknown), name, {
            get,
            set,
        });
    });
}
