import type { InstantiatedWasm } from "../../wasm.js";

export function getTableFunction<T extends Function>(impl: InstantiatedWasm, signaturePtr: number, functionIndex: number): T {
    const fp = impl.exports.__indirect_function_table.get(functionIndex);
    console.assert(typeof fp == "function");
    return fp as T;
}