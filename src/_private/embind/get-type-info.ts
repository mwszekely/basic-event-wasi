import type { EmboundRegisteredType, TypeID } from "./types.js";

export interface PromiseWithResolversAndValue<T> extends PromiseWithResolvers<T> {
    resolvedValue: T;
}
const DependenciesToWaitFor: Map<TypeID, PromiseWithResolversAndValue<EmboundRegisteredType<any, any>>> = new Map<TypeID, PromiseWithResolversAndValue<EmboundRegisteredType<any, any>>>();

/**
 * Returns the parsed type info, converters, etc. for the given C++ RTTI TypeID pointer.
 *
 * Passing a null type ID is fine and will just result in a `null` at that spot in the returned array.
 */
export async function getTypeInfo<E extends (EmboundRegisteredType<any, any> | null | undefined)[]>(...typeIds: number[]): Promise<E> {

    return await Promise.all<NonNullable<E[number]>>(typeIds.map(async (typeId): Promise<NonNullable<E[number]>> => {
        if (!typeId)
            return Promise.resolve(null!);

        let withResolvers = getDependencyResolvers(typeId);
        return await (withResolvers.promise as Promise<NonNullable<E[number]>>);
    })) as any;
}

export function getDependencyResolvers(typeId: number): PromiseWithResolversAndValue<EmboundRegisteredType<any, any>> {
    let withResolvers = DependenciesToWaitFor.get(typeId);
    if (withResolvers === undefined)
        DependenciesToWaitFor.set(typeId, withResolvers = { resolvedValue: undefined!, ...Promise.withResolvers<EmboundRegisteredType<any, any>>() });
    return withResolvers;
}
