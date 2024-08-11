//import "core-js";


import * as Comlink from "comlink";
import { instantiate } from "./instantiate.js";

const wasm = await instantiate("Worker");
Comlink.expose({
    execute(str: string) {
        return (new Function("wasm", str))(wasm);
    }
});

