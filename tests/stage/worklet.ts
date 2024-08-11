import "./worklet-polyfill.js";

//import "core-js";


import * as Comlink from "comlink";
import { InstantiatedWasi } from "../../dist/instantiated-wasi.js";
import { instantiate, KnownInstanceExports } from "./instantiate.js";



// Testing an audio worklet is a little tough because
// they don't have `fetch`, don't have `Event` (in some environments), etc...

let { promise: uninstantiatedWasm, resolve: resolveUninstantiatedWasm } = Promise.withResolvers<ArrayBuffer>();



let wasm: InstantiatedWasi<KnownInstanceExports> = null!;

uninstantiatedWasm.then(binary => instantiate("Worklet", binary).then(w => wasm = w));

class RandomNoiseProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        Comlink.expose({
            provideWasm(data: ArrayBuffer) {
                resolveUninstantiatedWasm(data);
            },
            execute(str: string) {
                return (new Function("wasm", str))(wasm);
            }
        }, this.port);

    }
    process(inputs: Float32Array[][], outputs: Float32Array[][], parameters: Record<string, Float32Array>) {
        if (wasm) {
            outputs[0].forEach((channel) => {
                for (let i = 0; i < channel.length; i++) {
                    channel[i] = (wasm.exports.getRandomNumber() * 2 - 1) / 1000;
                }
            });
        }
        return true;
    }
}


registerProcessor("random-noise-processor", RandomNoiseProcessor);










interface AudioWorkletProcessor {
    readonly port: MessagePort;
}

interface AudioWorkletProcessorImpl extends AudioWorkletProcessor {
    process(
        inputs: Float32Array[][],
        outputs: Float32Array[][],
        parameters: Record<string, Float32Array>
    ): boolean;
}

declare var AudioWorkletProcessor: {
    prototype: AudioWorkletProcessor;
    new(options?: AudioWorkletNodeOptions): AudioWorkletProcessor;
};

type AudioParamDescriptor = {
    name: string,
    automationRate: AutomationRate,
    minValue: number,
    maxValue: number,
    defaultValue: number
}

interface AudioWorkletProcessorConstructor {
    new(options?: AudioWorkletNodeOptions): AudioWorkletProcessorImpl;
    parameterDescriptors?: AudioParamDescriptor[];
}

declare function registerProcessor(
    name: string,
    processorCtor: AudioWorkletProcessorConstructor,
): void;
