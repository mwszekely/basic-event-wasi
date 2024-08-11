import { createGlueFunction } from "../_private/embind/create-glue-function.js";
import { EmboundClasses } from "../_private/embind/embound-class.js";
import { readArrayOfTypes } from "../_private/embind/read-array-of-types.js";
import { _embind_register } from "../_private/embind/register.js";
import { InstantiatedWasi } from "../instantiated-wasi.js";


export function _embind_register_class_function(this: InstantiatedWasi<{}>,  
    rawClassTypeId: number,
    methodNamePtr: number,
    argCount: number,
    rawArgTypesPtr: number, // [ReturnType, ThisType, Args...]
    invokerSignaturePtr: number,
    invokerIndex: number,
    invokerContext: number,
    isPureVirtual: number,
    isAsync: number
): void {
    const [returnTypeId, thisTypeId, ...argTypeIds] = readArrayOfTypes(this, argCount, rawArgTypesPtr);
    //console.assert(thisTypeId != rawClassTypeId,`Internal error; expected the RTTI pointers for the class type and its pointer type to be different.`);
    _embind_register(this, methodNamePtr, async (name) => {

        ((EmboundClasses[rawClassTypeId] as any).prototype as any)[name] = await createGlueFunction(
            this,
            name,
            returnTypeId,
            argTypeIds,
            invokerSignaturePtr,
            invokerIndex,
            invokerContext
        );
    });
}
