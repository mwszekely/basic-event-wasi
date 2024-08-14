import { readSizeT } from "../../util/read-sizet.js";
import { getSizeTSize } from "../../util/sizet.js";
import { writeSizeT } from "../../util/write-sizet.js";
import { writeUint16 } from "../../util/write-uint16.js";
import { writeUint32 } from "../../util/write-uint32.js";
import { writeUint8 } from "../../util/write-uint8.js";
import type { InstantiatedWasm } from "../../wasm.js";
import { stringToUtf16, stringToUtf32, stringToUtf8, utf16ToStringL, utf32ToStringL, utf8ToStringL } from "../string.js";
import { finalizeType } from "./finalize.js";
import { _embind_register } from "./register.js";
import type { WireConversionResult } from "./types.js";

// Shared between std::string and std::wstring
export function _embind_register_std_string_any(impl: InstantiatedWasm, typePtr: number, charWidth: 1 | 2 | 4, namePtr: number): void {

    const utfToStringL = (charWidth == 1) ? utf8ToStringL : (charWidth == 2) ? utf16ToStringL : utf32ToStringL;
    const stringToUtf = (charWidth == 1) ? stringToUtf8 : (charWidth == 2) ? stringToUtf16 : stringToUtf32;
    const UintArray = (charWidth == 1) ? Uint8Array : (charWidth == 2) ? Uint16Array : Uint32Array;
    const writeUint = (charWidth == 1) ? writeUint8 : (charWidth == 2) ? writeUint16 : writeUint32;


    _embind_register(impl, namePtr, (name) => {

        const fromWireType = (ptr: number) => {
            // The wire type is a pointer to a "struct" (not really a struct in the usual sense...
            // except maybe in newer C versions I guess) where 
            // the first field is a size_t representing the length,
            // And the second "field" is the string data itself,
            // finally all ended with an extra null byte.
            const length = readSizeT(impl, ptr);
            const payload = ptr + getSizeTSize(impl);
            const decodeStartPtr = payload;
            const str = utfToStringL(impl, decodeStartPtr, length);

            return {
                jsValue: str,
                wireValue: ptr,
                stackDestructor: () => {
                    // This call to _free happens because Embind calls malloc during its toWireType function.
                    // Surely there's a way to avoid this copy of a copy of a copy though, right? Right?
                    impl.exports.free(ptr);
                }
            };
        };

        const toWireType = (str: string): WireConversionResult<number, string> => {

            const valueAsArrayBufferInJS = new UintArray(stringToUtf(str));

            // Is it more or less clear with all these variables explicitly named?
            // Hopefully more, at least slightly.
            const charCountWithoutNull = valueAsArrayBufferInJS.length;
            const charCountWithNull = charCountWithoutNull + 1;

            const byteCountWithoutNull = charCountWithoutNull * charWidth;
            const byteCountWithNull = charCountWithNull * charWidth;

            // 1. (m)allocate space for the struct above
            const wasmStringStruct = impl.exports.malloc(getSizeTSize(impl) + byteCountWithNull);

            // 2. Write the length of the string to the struct
            const stringStart = wasmStringStruct + getSizeTSize(impl);
            writeSizeT(impl, wasmStringStruct, charCountWithoutNull);

            // 3. Write the string data to the struct
            const destination = new UintArray(impl.exports.memory.buffer, stringStart, byteCountWithoutNull);
            destination.set(valueAsArrayBufferInJS);

            // 4. Write a null byte
            writeUint(impl, stringStart + byteCountWithoutNull, 0);

            return {
                stackDestructor: () => impl.exports.free(wasmStringStruct),
                wireValue: wasmStringStruct,
                jsValue: str
            };
        };

        finalizeType(impl, name, {
            typeId: typePtr,
            fromWireType,
            toWireType,
        });
    });
}
