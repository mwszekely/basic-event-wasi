import type { EmboundRegisteredType, WireTypes } from "./types.js";
export interface PromiseWithResolversAndValue<T> extends PromiseWithResolvers<T> {
    resolvedValue: T;
}
/**
 * Returns the parsed type info, converters, etc. for the given C++ RTTI TypeID pointer.
 *
 * Passing a null type ID is fine and will just result in a `null` at that spot in the returned array.
 */
export declare function getTypeInfo<E extends (EmboundRegisteredType | null | undefined)[]>(...typeIds: number[]): Promise<E>;
export declare function getDependencyResolvers<WireType extends WireTypes, T>(typeId: number): PromiseWithResolversAndValue<EmboundRegisteredType<WireType, T>>;
//# sourceMappingURL=get-type-info.d.ts.map