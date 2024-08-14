import { finalizeType } from "../_private/embind/finalize.js";
import { _embind_register } from "../_private/embind/register.js";
import type { InstantiatedWasm } from "../wasm.js";


export function _embind_register_bigint(this: InstantiatedWasm, rawTypePtr: number, namePtr: number, size: number, minRange: bigint, maxRange: bigint): void {
    _embind_register(this, namePtr, async (name) => {

        const isUnsigned = (minRange === 0n);
        const fromWireType = isUnsigned ? fromWireTypeUnsigned : fromWireTypeSigned;

        finalizeType<bigint, bigint>(this, name, {
            typeId: rawTypePtr,
            fromWireType,
            toWireType: value => ({ wireValue: value, jsValue: value }),
        });
    });
}

function fromWireTypeSigned(wireValue: bigint) { return { wireValue, jsValue: BigInt(wireValue) }; }
function fromWireTypeUnsigned(wireValue: bigint) { return { wireValue, jsValue: BigInt(wireValue) & 0xFFFF_FFFF_FFFF_FFFFn } }