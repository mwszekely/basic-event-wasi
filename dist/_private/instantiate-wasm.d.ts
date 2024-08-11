import type { InstantiatedWasi } from "../instantiated-wasi.js";
import type { EntirePublicInterface } from "../types.js";
export type RollupWasmPromise<I extends EntirePublicInterface = EntirePublicInterface> = (imports?: I) => Promise<WebAssembly.WebAssemblyInstantiatedSource>;
export declare function instantiateWasmGeneric<E extends {}, I extends EntirePublicInterface = EntirePublicInterface>(instantiateWasm: (boundImports: I) => Promise<WebAssembly.WebAssemblyInstantiatedSource>, unboundImports: I): Promise<InstantiatedWasi<E>>;
//# sourceMappingURL=instantiate-wasm.d.ts.map