import { createGlueFunction } from "../_private/embind/create-glue-function.js";
import { EmboundClasses } from "../_private/embind/embound-class.js";
import { readArrayOfTypes } from "../_private/embind/read-array-of-types.js";
import { _embind_register } from "../_private/embind/register.js";
import { InstantiatedWasm } from "../wasm.js";


export function _embind_register_class_function(this: InstantiatedWasm,
    rawClassTypeId: number,
    methodNamePtr: number,
    argCount: number,
    rawArgTypesPtr: number, // [ReturnType, ThisType, Args...]
    invokerSignaturePtr: number,
    invokerIndex: number,
    invokerContext: number,
    _isPureVirtual: number,
    _isAsync: number
): void {
    const [returnTypeId, _thisTypeId, ...argTypeIds] = readArrayOfTypes(this, argCount, rawArgTypesPtr);
    //console.assert(thisTypeId != rawClassTypeId,`Internal error; expected the RTTI pointers for the class type and its pointer type to be different.`);
    _embind_register(this, methodNamePtr, async (name) => {

        (EmboundClasses[rawClassTypeId].prototype as never)[name] = await createGlueFunction(
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
