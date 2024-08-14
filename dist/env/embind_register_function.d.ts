import type { InstantiatedWasm } from "../wasm.js";
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
export declare function _embind_register_function(this: InstantiatedWasm, namePtr: number, argCount: number, rawArgTypesPtr: number, signature: number, rawInvokerPtr: number, functionIndex: number, isAsync: boolean): void;
//# sourceMappingURL=embind_register_function.d.ts.map