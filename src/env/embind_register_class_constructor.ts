import { createGlueFunction } from "../_private/embind/create-glue-function.js";
import { EmboundClasses } from "../_private/embind/embound-class.js";
import { readArrayOfTypes } from "../_private/embind/read-array-of-types.js";
import { _embind_register_known_name } from "../_private/embind/register.js";
import { InstantiatedWasm } from "../wasm.js";


export function _embind_register_class_constructor(this: InstantiatedWasm,
    rawClassTypeId: number,
    argCount: number,
    rawArgTypesPtr: number,
    invokerSignaturePtr: number,
    invokerIndex: number,
    invokerContext: number
): void {
    const [returnTypeId, ...argTypeIds] = readArrayOfTypes(this, argCount, rawArgTypesPtr);
    _embind_register_known_name(this, "<constructor>", async () => {
        ((EmboundClasses[rawClassTypeId] as any))._constructor = await createGlueFunction(this, "<constructor>", returnTypeId, argTypeIds, invokerSignaturePtr, invokerIndex, invokerContext);
    });
}
