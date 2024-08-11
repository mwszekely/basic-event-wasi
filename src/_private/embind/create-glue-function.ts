import { InstantiatedWasi } from "../../instantiated-wasi.js";
import { renameFunction } from "./create-named-function.js";
import { runDestructors } from "./destructors.js";
import { EmboundClass } from "./embound-class.js";
import { getTableFunction } from "./get-table-function.js";
import { getTypeInfo } from "./get-type-info.js";
import { EmboundRegisteredType, WireTypes } from "./types.js";

/**
 * Creates a JS function that calls a C++ function, accounting for `this` types and context.
 * 
 * It converts all arguments before passing them, and converts the return type before returning.
 * 
 * @param impl 
 * @param argTypeIds All RTTI TypeIds, in the order of [RetType, ThisType, ...ArgTypes]. ThisType can be null for standalone functions.
 * @param invokerSignature A pointer to the signature string.
 * @param invokerIndex The index to the invoker function in the `WebAssembly.Table`.
 * @param invokerContext The context pointer to use, if any.
 * @returns 
 */
export async function createGlueFunction<F extends ((...args: any[]) => any) | Function>(
    impl: InstantiatedWasi<{}>,
    name: string,
    returnTypeId: number,
    argTypeIds: number[],
    invokerSignature: number,
    invokerIndex: number,
    invokerContext: number | null
): Promise<F> {

    type R = EmboundRegisteredType<WireTypes, any>;
    //type ThisType = null | undefined | EmboundRegisteredType<WireTypes, any>;
    type ArgTypes = EmboundRegisteredType<WireTypes, any>[];


    const [returnType, ...argTypes] = await getTypeInfo<[R, ...ArgTypes]>(returnTypeId, ...argTypeIds);
    const rawInvoker = getTableFunction<(...args: WireTypes[]) => any>(impl, invokerSignature, invokerIndex);


    return renameFunction(name, function (this: EmboundClass, ...jsArgs: any[]) {
        const wiredThis = this ? this._this : undefined;
        const wiredArgs: WireTypes[] = [];
        const stackBasedDestructors: (() => void)[] = [];   // Used to pretend like we're a part of the WASM stack, which would destroy these objects afterwards.

        if (invokerContext)
            wiredArgs.push(invokerContext);
        if (wiredThis)
            wiredArgs.push(wiredThis);

        // Convert each JS argument to its WASM equivalent (generally a pointer, or int/float)
        for (let i = 0; i < argTypes.length; ++i) {
            const type = argTypes[i];
            const arg = jsArgs[i];
            const { jsValue, wireValue, stackDestructor } = type.toWireType(arg);
            wiredArgs.push(wireValue);
            if (stackDestructor)
                stackBasedDestructors.push(() => stackDestructor(jsValue, wireValue));
        }

        // Finally, call the "raw" WASM function
        let wiredReturn: WireTypes = rawInvoker(...wiredArgs);

        // Still pretending we're a part of the stack, 
        // now destruct everything we "pushed" onto it.
        runDestructors(stackBasedDestructors);

        // Convert whatever the WASM function returned to a JS representation
        // If the object returned is Disposable, then we let the user dispose of it
        // when ready.
        //
        // Otherwise (namely strings), dispose its original representation now.
        const { jsValue, wireValue, stackDestructor } = returnType?.fromWireType(wiredReturn);
        if (stackDestructor && !(jsValue && typeof jsValue == "object" && (Symbol.dispose in jsValue)))
            stackDestructor(jsValue, wireValue);

        return jsValue;

    } as F);
}
