import type { InstantiatedWasm } from "../../wasm.js";

/* eslint @typescript-eslint/no-unsafe-function-type: "off" */
export function getTableFunction<T extends ((...args: unknown[]) => unknown) | Function>(impl: InstantiatedWasm, _signaturePtr: number, functionIndex: number): T {
    const fp = impl.exports.__indirect_function_table.get(functionIndex) as T;
    console.assert(typeof fp == "function");
    return fp;
}