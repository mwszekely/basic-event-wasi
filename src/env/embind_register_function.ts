import { createGlueFunction } from "../_private/embind/create-glue-function.js";
import { readArrayOfTypes } from "../_private/embind/read-array-of-types.js";
import { _embind_register } from "../_private/embind/register.js";
import type { InstantiatedWasi } from "../instantiated-wasi.js";


/**
 * 
 * @param namePtr A pointer to the null-terminated name of this export.
 * @param argCount The number of arguments the WASM function takes
 * @param rawArgTypesPtr A pointer to an array of numbers, each representing a TypeID. The 0th value is the return type, the rest are the arguments themselves.
 * @param signature A pointer to a null-terminated string representing the WASM signature of the function; e.g. "`p`", "`fpp`", "`vp`", "`fpfff`", etc.
 * @param rawInvokerPtr The pointer to the function in WASM.
 * @param functionIndex The index of the function in the `WebAssembly.Table` that's exported.
 * @param isAsync Unused...probably
 */
export function _embind_register_function(
    this: InstantiatedWasi<{}>,
    namePtr: number,
    argCount: number,
    rawArgTypesPtr: number,
    signature: number,
    rawInvokerPtr: number,
    functionIndex: number,
    isAsync: boolean
): void {
    const [returnTypeId, ...argTypeIds] = readArrayOfTypes(this, argCount, rawArgTypesPtr);

    _embind_register(this, namePtr, async (name) => {
        (this.embind as any)[name] = await createGlueFunction(this, name, returnTypeId, argTypeIds, signature, rawInvokerPtr, functionIndex);
    });
}


