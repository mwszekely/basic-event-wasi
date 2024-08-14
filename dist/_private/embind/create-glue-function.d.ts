import { InstantiatedWasm } from "../../wasm.js";
/**
 * Creates a JS function that calls a C++ function, accounting for `this` types and context.
 *
 * It converts all arguments before passing them, and converts the return type before returning.
 *
 * @param impl
 * @param argTypeIds All RTTI TypeIds, in the order of [RetType, ThisType, ...ArgTypes]. ThisType can be null for standalone functions.
 * @param invokerSignature A pointer to the signature string.
 * @param invokerIndex The index to the invoker function in the `WebAssembly.Table`.
 * @param invokerContext The context pointer to use, if any.
 * @returns
 */
export declare function createGlueFunction<F extends ((...args: unknown[]) => unknown) | Function>(impl: InstantiatedWasm, name: string, returnTypeId: number, argTypeIds: number[], invokerSignature: number, invokerIndex: number, invokerContext: number | null): Promise<F>;
//# sourceMappingURL=create-glue-function.d.ts.map