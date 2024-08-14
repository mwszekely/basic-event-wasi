
/* eslint @typescript-eslint/no-unsafe-function-type: "off" */
export function renameFunction<T extends ((...args: unknown[]) => unknown) | Function>(name: string, body: T): T {
    return Object.defineProperty(body, 'name', { value: name });
}
