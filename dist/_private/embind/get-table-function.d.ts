import type { InstantiatedWasm } from "../../wasm.js";
export declare function getTableFunction<T extends ((...args: unknown[]) => unknown) | Function>(impl: InstantiatedWasm, _signaturePtr: number, functionIndex: number): T;
//# sourceMappingURL=get-table-function.d.ts.map