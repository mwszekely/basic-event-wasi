import { InstantiatedWasi } from "../../instantiated-wasi.js";
import { getDependencyResolvers } from "./get-type-info.js";
import { EmboundRegisteredType, WireTypes } from "./types.js";

/**
 * Convenience function to set a value on the `embind` object.  Not strictly necessary to call.
 * @param impl 
 * @param name 
 * @param value 
 */
export function registerEmbound<T>(impl: InstantiatedWasi<{}>, name: string, value: T): void {
    (impl.embind as any)[name] = value;
}

/**
 * Call when a type is ready to be used by other types.
 * 
 * For things like `int` or `bool`, this can just be called immediately upon registration.
 * @param info 
 */
export function finalizeType<WT extends WireTypes, T>(impl: InstantiatedWasi<{}>, name: string, parsedTypeInfo: Omit<EmboundRegisteredType<WT, T>, "name">): void {
    const info = { name, ...parsedTypeInfo };
    let withResolvers = getDependencyResolvers(info.typeId);
    withResolvers.resolve(withResolvers.resolvedValue = info);
}
