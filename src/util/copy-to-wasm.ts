import { InstantiatedWasi } from "../instantiated-wasi.js";
import type { Pointer } from "../types.js";



export function copyToWasm(instance: InstantiatedWasi<{}>, destinationAddress: Pointer<number>, sourceData: Uint8Array | Int8Array): void {
    (new Uint8Array(instance.cachedMemoryView.buffer, destinationAddress, sourceData.byteLength)).set(sourceData);
}
