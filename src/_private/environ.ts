import type { InstantiatedWasm } from "../wasm.js";


export interface EnvironGetEventDetail {
    /**
     * A list of environment variable tuples; a key and a value. 
     * This array is mutable; when event dispatch ends, the final 
     * value of this array will be used to populate environment variables.
     */
    strings: [key: string, value: string][];
}

export class EnvironGetEvent extends CustomEvent<EnvironGetEventDetail> {
    constructor() {
        super("environ_get", { cancelable: false, detail: { strings: [] } });
    }
}

const EnvironInfoSymbol = Symbol();
export interface EnvironInfo {
    bufferSize: number;
    strings: Uint8Array[];
}
interface WithEnvironInfo {
    [EnvironInfoSymbol]: EnvironInfo;
}

export function getEnviron(impl: InstantiatedWasm): EnvironInfo {
    return (impl as unknown as WithEnvironInfo)[EnvironInfoSymbol] ??= (() => {
        const t = new TextEncoder();
        const e = new EnvironGetEvent();
        impl.dispatchEvent(e);
        const strings = e.detail.strings;
        let bufferSize = 0;
        const buffers: Uint8Array[] = [];
        for (const [key, value] of strings) {
            const utf8 = t.encode(`${key}=${value}\x00`);
            bufferSize += utf8.length + 1;
            buffers.push(utf8);
        }
        return { bufferSize, strings: buffers }
    })()

}

