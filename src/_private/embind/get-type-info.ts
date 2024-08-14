import type { EmboundRegisteredType, TypeID, WireTypes } from "./types.js";

export interface PromiseWithResolversAndValue<T> extends PromiseWithResolvers<T> {
    resolvedValue: T;
}
const DependenciesToWaitFor: Map<TypeID, PromiseWithResolversAndValue<EmboundRegisteredType>> = new Map<TypeID, PromiseWithResolversAndValue<EmboundRegisteredType>>();

/**
 * Returns the parsed type info, converters, etc. for the given C++ RTTI TypeID pointer.
 *
 * Passing a null type ID is fine and will just result in a `null` at that spot in the returned array.
 */
export async function getTypeInfo<E extends (EmboundRegisteredType | null | undefined)[]>(...typeIds: number[]): Promise<E> {

    return await (Promise.all<NonNullable<E[number]>>(typeIds.map(async (typeId): Promise<NonNullable<E[number]>> => {
        if (!typeId)
            return Promise.resolve(null!);

        const withResolvers = getDependencyResolvers(typeId);
        return await (withResolvers.promise as Promise<NonNullable<E[number]>>);
    })) as unknown as Promise<E>);
}

export function getDependencyResolvers<WireType extends WireTypes, T>(typeId: number): PromiseWithResolversAndValue<EmboundRegisteredType<WireType, T>> {
    let withResolvers = DependenciesToWaitFor.get(typeId) as PromiseWithResolversAndValue<EmboundRegisteredType<WireType, T>> | undefined;
    if (withResolvers === undefined)
        DependenciesToWaitFor.set(typeId, withResolvers = { resolvedValue: undefined!, ...Promise.withResolvers<EmboundRegisteredType<WireTypes, unknown>>() } satisfies PromiseWithResolversAndValue<EmboundRegisteredType> as never);
    return withResolvers;
}
