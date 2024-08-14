import { InstantiatedWasm } from "../../wasm.js";
/**
 * Registering a type is an async function called by a sync function. This handles the conversion, adding the promise to `AllEmbindPromises`.
 *
 * Also, because every single registration comes with a name that needs to be parsed, this also parses that name for you.
 */
export declare function _embind_register(impl: InstantiatedWasm, namePtr: number, func: (name: string) => (void | Promise<void>)): void;
/**
 * Same as `_embind_register`, but for known (or synthetic) names.
 */
export declare function _embind_register_known_name(impl: InstantiatedWasm, name: string, func: (name: string) => (void | Promise<void>)): void;
export declare function awaitAllEmbind(): Promise<void>;
//# sourceMappingURL=register.d.ts.map