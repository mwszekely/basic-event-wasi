import { finalizeType } from "../_private/embind/finalize.js";
import { _embind_register } from "../_private/embind/register.js";
import { EmboundRegisteredType } from "../_private/embind/types.js";
import type { InstantiatedWasi } from "../instantiated-wasi.js";

export function _embind_register_integer(this: InstantiatedWasi<{}>, typePtr: number, namePtr: number, byteWidth: number, minValue: number, maxValue: number): void {
    _embind_register(this, namePtr, async (name) => {

        const isUnsignedType = (minValue === 0);
        const fromWireType = isUnsignedType ? fromWireTypeU(byteWidth) : fromWireTypeS(byteWidth);

        // TODO: min/maxValue aren't used for bounds checking,
        // but if they are, make sure to adjust maxValue for the same signed/unsigned type issue
        // on 32-bit signed int types:
        // maxValue = fromWireType(maxValue);

        finalizeType<number, number>(this, name, {
            typeId: typePtr,
            fromWireType,
            toWireType: (jsValue: number) => ({ wireValue: jsValue, jsValue })
        });
    });
}


// We need a separate function for unsigned conversion because WASM only has signed types, 
// even when languages have unsigned types, and it expects the client to manage the transition.
// So this is us, managing the transition.
function fromWireTypeU(byteWidth: number): EmboundRegisteredType<number, number>["fromWireType"] {
    // Shift out all the bits higher than what would fit in this integer type,
    // but in particular make sure the negative bit gets cleared out by the >>> at the end.
    const overflowBitCount = 32 - 8 * byteWidth;
    return function (wireValue: number) {
        return { wireValue, jsValue: ((wireValue << overflowBitCount) >>> overflowBitCount) };
    }
}

function fromWireTypeS(byteWidth: number): EmboundRegisteredType<number, number>["fromWireType"] {
    // Shift out all the bits higher than what would fit in this integer type.
    const overflowBitCount = 32 - 8 * byteWidth;
    return function (wireValue: number) {
        return { wireValue, jsValue: ((wireValue << overflowBitCount) >> overflowBitCount) };
    }
}