import { createGlueFunction } from "../_private/embind/create-glue-function.js";
import { EmboundClasses } from "../_private/embind/embound-class.js";
import { readArrayOfTypes } from "../_private/embind/read-array-of-types.js";
import { _embind_register } from "../_private/embind/register.js";
import { InstantiatedWasm } from "../wasm.js";


export function _embind_register_class_class_function(this: InstantiatedWasm,
    rawClassTypeId: number,
    methodNamePtr: number,
    argCount: number,
    rawArgTypesPtr: number,
    invokerSignaturePtr: number,
    invokerIndex: number,
    invokerContext: number,
    isAsync: number
): void {
    const [returnTypeId, ...argTypeIds] = readArrayOfTypes(this, argCount, rawArgTypesPtr);
    _embind_register(this, methodNamePtr, async (name) => {
        ((EmboundClasses[rawClassTypeId] as any))[name] = await createGlueFunction(this, name, returnTypeId, argTypeIds, invokerSignaturePtr, invokerIndex, invokerContext);
    });
}
