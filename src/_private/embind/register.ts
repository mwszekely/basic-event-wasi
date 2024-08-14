import { InstantiatedWasm } from "../../wasm.js";
import { readLatin1String } from "../string.js";

/**
 * Registering a type is an async function called by a sync function. This handles the conversion, adding the promise to `AllEmbindPromises`.
 * 
 * Also, because every single registration comes with a name that needs to be parsed, this also parses that name for you.
 */
export function _embind_register(impl: InstantiatedWasm, namePtr: number, func: (name: string) => (void | Promise<void>)): void {
    _embind_register_known_name(impl, readLatin1String(impl, namePtr), func);
}

/** 
 * Same as `_embind_register`, but for known (or synthetic) names.
 */
export function _embind_register_known_name(_impl: InstantiatedWasm, name: string, func: (name: string) => (void | Promise<void>)): void {

    const promise: Promise<void> = (async () => {
        let handle = 0;
        // Fun fact: setTimeout doesn't exist in Worklets! 
        // I guess it vaguely makes sense in a "determinism is good" way, 
        // but it also seems generally useful there?
        if (typeof setTimeout === 'function')
            handle = setTimeout(() => { console.warn(`The function "${name}" uses an unsupported argument or return type, as its dependencies are not resolving. It's unlikely the embind promise will resolve.`); }, 1000);
        await func(name);
        if (handle)
            clearTimeout(handle);
    })();

    AllEmbindPromises.push(promise);
}

export async function awaitAllEmbind(): Promise<void> {
    await Promise.all(AllEmbindPromises);
}

const AllEmbindPromises = new Array<Promise<void>>();

