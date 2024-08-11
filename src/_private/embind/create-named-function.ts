
export function renameFunction<T extends ((...args: any[]) => any) | Function>(name: string, body: T): T {
    return Object.defineProperty(body, 'name', { value: name });
}
