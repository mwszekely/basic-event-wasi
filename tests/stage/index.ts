//import "core-js";

import { wrap } from "comlink";
import { } from "../../dist/index.js";
import { instantiate } from "./instantiate.js";

const wasm = await instantiate("Main");
document.getElementById("ready-main")!.innerHTML = "✔️";

interface StructTest extends Disposable {
    string: string;
    number: number;
    triple: [number, number, number];
}
declare module "../../dist/index.js" {
    export interface EmboundTypes {

        identity_u8(n: number): number;
        identity_i8(n: number): number;
        identity_u16(n: number): number;
        identity_i16(n: number): number;
        identity_u32(n: number): number;
        identity_i32(n: number): number;
        identity_u64(n: bigint): bigint;
        identity_i64(n: bigint): bigint;
        identity_string(n: string): string;
        identity_wstring(n: string): string;
        identity_old_enum(n: any): string;
        identity_new_enum(n: any): string;
        identity_struct_pointer(n: StructTest): StructTest;
        struct_create(): StructTest;
        struct_consume(n: StructTest): void;
        identity_struct_copy(n: StructTest): StructTest;
        testClassArray(): number;
        nowSteady(): number;
        nowSystem(): number;
        throwsException(): never;
    }
}
const structTest: StructTest = {
    string: "Test string of a length long enough to hopefully cause issues if something goes wrong",
    number: 0xFFFF,
    triple: [10, 100, 1000],
    [Symbol.dispose]: undefined!
}
//const point = (wasm.embind as any).getPoint();
/*
const ch = (wasm.embind as any).charAt("test", 3);
console.log(ch);
const structTest: StructTest = {
    string: "Test string of a length long enough to hopefully cause issues if something goes wrong",
    number: 0xFFFF,
    triple: [10, 100, 1000]
}
console.log(wasm.embind.identity_new_enum((wasm.embind as any).NewStyle.TEN));
console.log(wasm.embind.identity_old_enum((wasm.embind as any).OldStyle.TEN));
//console.log(wasm.embind.identity_struct_pointer(structTest));
console.log(wasm.embind.identity_struct_copy(structTest));
{
    const cls = new (wasm.embind as any).MyClass(5);
    debugger;
    console.log((wasm.embind as any).identity_intptr(cls._this));
    cls.incrementX().incrementX();

    console.log(cls);
    console.log(cls.x);
    console.assert(cls == (wasm.embind as any).MyClass.identityPointer(cls));
    console.assert(cls == (wasm.embind as any).MyClass.identityConstPointer(cls));
    console.assert(cls == (wasm.embind as any).MyClass.identityReference(cls));
//  console.assert(cls == (wasm.embind as any).MyClass.identityConstReference(cls));
    console.assert(cls != (wasm.embind as any).MyClass.identityCopy(cls));
    cls.incrementX().incrementX();
    console.log(cls.x);
    console.log(cls.setX(10));
    console.log(cls.x);
    console.log(cls.x = 15);
    console.log(cls.getX());
    debugger;
   // console.log(vec2, r);
    cls[Symbol.dispose]();
}

//wasm.exports.printTest();

console.log(wasm.embind.identity_u8(+0x00 + 1), wasm.embind.identity_u8(0xFF - 1));
console.log(wasm.embind.identity_i8(-0x80 + 1), wasm.embind.identity_i8(0x7F - 1));
console.log(wasm.embind.identity_u16(+0x0000 + 1), wasm.embind.identity_u16(0xFFFF - 1));
console.log(wasm.embind.identity_i16(-0x8000 + 1), wasm.embind.identity_i16(0x7FFF - 1));
console.log(wasm.embind.identity_u32(+0x0000_0000 + 1), wasm.embind.identity_u32(0xFFFF_FFFF - 1));
console.log(wasm.embind.identity_i32(-0x8000_0000 + 1), wasm.embind.identity_i32(0x7FFF_FFFF - 1));
console.log(wasm.embind.identity_u64(0x0000_0000_0000_0000n + 1n), wasm.embind.identity_u64(0xFFFF_FFFF_FFFF_FFFFn - 1n));
console.log(wasm.embind.identity_i64(-0x8000_0000_0000_0000n + 1n), wasm.embind.identity_i64(0x7FFF_FFFF_FFFF_FFFFn - 1n));
console.log(wasm.embind.identity_string("identity_string"));
console.log(wasm.embind.identity_wstring("identity_wstring"));*/



const mainElement = document.getElementById("main") as HTMLDivElement;
const workerElement = document.getElementById("worker") as HTMLDivElement;
const workletElement = document.getElementById("worklet") as HTMLDivElement;

const w = new Worker("./js/worker.js", { type: "module" });
const worker = wrap<{ execute(func: string): unknown }>(w);
document.getElementById("ready-worker")!.innerHTML = "✔️";
(globalThis as any)._worker = worker;
(globalThis as any)._wasm = wasm;
debugger;
/*wasm.addEventListener("WebAssemblyExceptionEvent", (event) => {debugger; event.preventDefault(); throw new (WebAssembly as any).Exception("Hi")});
try {
wasm.embind.throwsException();
}
catch (ex) {
    console.error(ex);
}*/
const cls = new (wasm.embind as any).TestClass(5, "test");
cls.getX();
cls[Symbol.dispose]();
wasm.embind.struct_consume(structTest)
const s = wasm.embind.struct_create();
//console.log(s);
s[Symbol.dispose]();
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

