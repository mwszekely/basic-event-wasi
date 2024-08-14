import { InstantiatedWasm } from "../../wasm.js";
import { getDependencyResolvers } from "./get-type-info.js";
import type { EmboundRegisteredType, WireTypes } from "./types.js";

/**
 * Convenience function to set a value on the `embind` object.  Not strictly necessary to call.
 * @param impl 
 * @param name 
 * @param value 
 */
export function registerEmbound<T>(impl: InstantiatedWasm, name: string, value: T): void {
    impl.embind[name as never] = value as never;
}

/**
 * Call when a type is ready to be used by other types.
 * 
 * For things like `int` or `bool`, this can just be called immediately upon registration.
 * @param info 
 */
export function finalizeType<WT extends WireTypes, T>(_impl: InstantiatedWasm, name: string, parsedTypeInfo: Omit<EmboundRegisteredType<WT, T>, "name">): void {
    const info = { name, ...parsedTypeInfo };
    const withResolvers = getDependencyResolvers<WT, T>(info.typeId);
    withResolvers.resolve(withResolvers.resolvedValue = info);
}
