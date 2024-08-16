import { InstantiatedWasm } from "../wasm.js";



export function copyToWasm(instance: InstantiatedWasm, destinationAddress: number, sourceData: Uint8Array | Int8Array): void {
    (new Uint8Array(instance.cachedMemoryView.buffer, destinationAddress, sourceData.byteLength)).set(sourceData);
}
