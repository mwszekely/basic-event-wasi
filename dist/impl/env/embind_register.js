const registeredTypes = {};
const awaitingDependencies = {};
const typeDependencies = {};
export class PrimitiveType {
    typeId;
    name;
    destructorType;
    constructor(typeId, name, destructorType) {
        this.typeId = typeId;
        this.name = name;
        this.destructorType = destructorType;
    }
}
/*
export interface SharedRegisterOptions {
    ignoreDuplicateRegistrations: boolean;
}

export function sharedRegisterType(typeId: string, registeredInstance: PrimitiveType, options: Partial<SharedRegisterOptions> = {}) {
    const name = registeredInstance.name;
    console.assert(!!typeId);
    if (!options.ignoreDuplicateRegistrations)
        console.assert(!(typeId in registeredTypes));

    registeredTypes[typeId] = registeredInstance;
    delete typeDependencies[typeId];
    if (awaitingDependencies[typeId]) {
        const depCallbacks = awaitingDependencies[typeId]!;
        delete awaitingDependencies[typeId];
        depCallbacks.forEach(cb => cb());
    }
}


export function registerType(rawType: string, registeredInstance: PrimitiveType, options: Partial<SharedRegisterOptions> = {}) {
    return sharedRegisterType(rawType, registeredInstance, options);
}

export function registerPrimitiveType(id: string, name: string, destructorType: DestructorType) {
    registerType(id, new PrimitiveType(id, name, destructorType));
}
*/