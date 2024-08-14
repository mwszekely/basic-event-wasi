//import "core-js";

import { wrap } from "comlink";
import { } from "../../dist/index.js";
import { instantiate, StructTest } from "./instantiate.js";

const wasm = await instantiate("Main");
document.getElementById("ready-main")!.innerHTML = "✔️";


const structTest: StructTest = {
    string: "Test string of a length long enough to hopefully cause issues if something goes wrong",
    number: 0xFFFF,
    triple: [10, 100, 1000]
}

const mainElement = document.getElementById("main") as HTMLDivElement;
const workerElement = document.getElementById("worker") as HTMLDivElement;
const workletElement = document.getElementById("worklet") as HTMLDivElement;

const w = new Worker("./js/worker.js", { type: "module" });
const worker = wrap<{ execute(func: string): unknown }>(w);
document.getElementById("ready-worker")!.innerHTML = "✔️";
(globalThis as any)._worker = worker;
(globalThis as any)._wasm = wasm;
/*wasm.addEventListener("WebAssemblyExceptionEvent", (event) => {debugger; event.preventDefault(); throw new (WebAssembly as any).Exception("Hi")});
try {
wasm.embind.throwsException();
}
catch (ex) {
    console.error(ex);
}*/
const cls = new wasm.embind.TestClass(5, "test");
debugger;
cls.x = 10;
cls.getX();
cls[Symbol.dispose]();
wasm.embind.struct_consume(structTest)
const s = wasm.embind.struct_create();
//console.log(s);
//s[Symbol.dispose]();
wasm.embind.identity_string("test string");
((globalThis as any)._memoryGrowth) = 0;
wasm.addEventListener("MemoryGrowthEvent", () => { ((globalThis as any)._memoryGrowth) += 1 });

/*
setInterval(() => {
    const nowSteadyC = wasm.embind.nowSteady();
    const nowSystemC = wasm.embind.nowSystem();
    const nowSteadyJ = performance.now();
    const nowSystemJ = Date.now();
    console.log(`${nowSteadyC}==${nowSteadyJ};${nowSystemC}==${nowSystemJ}`);
}, 1000)*/

await new Promise(resolve => setTimeout(resolve, 250));    // TODO(?): Comlink timing issue
mainElement.innerText = wasm.exports.getKey().toString(16).toUpperCase();
workerElement.innerText = `${await worker.execute("return wasm.exports.getKey().toString(16).toUpperCase()")}`;

(async () => {
    await new Promise(resolve => setTimeout(resolve, 250));    // AudioContext click timing issue(????)
    const { promise, resolve } = Promise.withResolvers<void>();
    window.addEventListener("click", e => {
        resolve();
    }, { once: true })
    await promise;
    const audioContext = new AudioContext();
    const sourceNodeL = audioContext.createConstantSource();
    const sourceNodeR = audioContext.createConstantSource();
    const mergerNode = audioContext.createChannelMerger(2);


    await audioContext.resume();
    await audioContext.audioWorklet.addModule(new URL("./worklet.js", import.meta.url));
    const randomNoiseNode = new AudioWorkletNode(
        audioContext,
        "random-noise-processor",
    );


    const c = wrap<{ execute(func: string): unknown, provideWasm(data: ArrayBuffer): void }>(randomNoiseNode.port);
    document.getElementById("ready-worklet")!.innerHTML = "✔️";
    document.getElementById("ready")!.innerHTML = "✔️";


    sourceNodeL.connect(mergerNode, 0, 0);
    sourceNodeR.connect(mergerNode, 0, 1);
    mergerNode.connect(randomNoiseNode);
    randomNoiseNode.connect(audioContext.destination);

    const ab = await (await fetch(new URL("./wasm.wasm", import.meta.url))).arrayBuffer();
    await c.provideWasm(ab);

    await new Promise(resolve => setTimeout(resolve, 250));
    workletElement.innerText = `${await c.execute("return wasm.exports.getKey().toString(16).toUpperCase()")}`;
})()

