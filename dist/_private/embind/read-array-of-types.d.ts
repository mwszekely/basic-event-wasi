import type { InstantiatedWasi } from "../../instantiated-wasi.js";
/**
 * Generally, Embind functions include an array of RTTI TypeIds in the form of
 * [RetType, ThisType?, ...ArgTypes]
 *
 * This returns that array of typeIds for a given function.
 */
export declare function readArrayOfTypes(impl: InstantiatedWasi<{}>, count: number, rawArgTypesPtr: number): number[];
//# sourceMappingURL=read-array-of-types.d.ts.map