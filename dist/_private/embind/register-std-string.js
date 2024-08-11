import { readSizeT } from "../../util/read-sizet.js";
import { getSizeTSize } from "../../util/sizet.js";
import { writeSizeT } from "../../util/write-sizet.js";
import { writeUint16 } from "../../util/write-uint16.js";
import { writeUint32 } from "../../util/write-uint32.js";
import { writeUint8 } from "../../util/write-uint8.js";
import { stringToUtf16, stringToUtf32, stringToUtf8, utf16ToStringL, utf32ToStringL, utf8ToStringL } from "../string.js";
import { finalizeType } from "./finalize.js";
import { _embind_register } from "./register.js";
// Shared between std::string and std::wstring
export function _embind_register_std_string_any(impl, typePtr, charWidth, namePtr) {
    const utfToStringL = (charWidth == 1) ? utf8ToStringL : (charWidth == 2) ? utf16ToStringL : utf32ToStringL;
    const stringToUtf = (charWidth == 1) ? stringToUtf8 : (charWidth == 2) ? stringToUtf16 : stringToUtf32;
    const UintArray = (charWidth == 1) ? Uint8Array : (charWidth == 2) ? Uint16Array : Uint32Array;
    const writeUint = (charWidth == 1) ? writeUint8 : (charWidth == 2) ? writeUint16 : writeUint32;
    _embind_register(impl, namePtr, async (name) => {
        const fromWireType = (ptr) => {
            // The wire type is a pointer to a "struct" (not really a struct in the usual sense...
            // except maybe in newer C versions I guess) where 
            // the first field is a size_t representing the length,
            // And the second "field" is the string data itself,
            // finally all ended with an extra null byte.
            let length = readSizeT(impl, ptr);
            let payload = ptr + getSizeTSize(impl);
            let str = "";
            let decodeStartPtr = payload;
            str = utfToStringL(impl, decodeStartPtr, length);
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
        const toWireType = (str) => {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVnaXN0ZXItc3RkLXN0cmluZy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9fcHJpdmF0ZS9lbWJpbmQvcmVnaXN0ZXItc3RkLXN0cmluZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFDQSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDckQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBQ25ELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUN2RCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFDekQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBQ3pELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUN2RCxPQUFPLEVBQUUsYUFBYSxFQUFFLGFBQWEsRUFBRSxZQUFZLEVBQUUsY0FBYyxFQUFFLGNBQWMsRUFBRSxhQUFhLEVBQUUsTUFBTSxjQUFjLENBQUM7QUFDekgsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGVBQWUsQ0FBQztBQUM3QyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFHakQsOENBQThDO0FBQzlDLE1BQU0sVUFBVSwrQkFBK0IsQ0FBQyxJQUEwQixFQUFFLE9BQWUsRUFBRSxTQUFvQixFQUFFLE9BQWU7SUFFOUgsTUFBTSxZQUFZLEdBQUcsQ0FBQyxTQUFTLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDO0lBQzNHLE1BQU0sV0FBVyxHQUFHLENBQUMsU0FBUyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FB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T0FBTyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQztnQkFDMUQsU0FBUyxFQUFFLGdCQUFnQjtnQkFDM0IsT0FBTyxFQUFFLEdBQUc7YUFDZixDQUFDO1FBQ04sQ0FBQyxDQUFDO1FBRUYsWUFBWSxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUU7WUFDckIsTUFBTSxFQUFFLE9BQU87WUFDZixZQUFZO1lBQ1osVUFBVTtTQUNiLENBQUMsQ0FBQztJQUNQLENBQUMsQ0FBQyxDQUFDO0FBQ1AsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB0eXBlIHsgSW5zdGFudGlhdGVkV2FzaSB9IGZyb20gXCIuLi8uLi9pbnN0YW50aWF0ZWQtd2FzaS5qc1wiO1xyXG5pbXBvcnQgeyByZWFkU2l6ZVQgfSBmcm9tIFwiLi4vLi4vdXRpbC9yZWFkLXNpemV0LmpzXCI7XHJcbmltcG9ydCB7IGdldFNpemVUU2l6ZSB9IGZyb20gXCIuLi8uLi91dGlsL3NpemV0LmpzXCI7XHJcbmltcG9ydCB7IHdyaXRlU2l6ZVQgfSBmcm9tIFwiLi4vLi4vdXRpbC93cml0ZS1zaXpldC5qc1wiO1xyXG5pbXBvcnQgeyB3cml0ZVVpbnQxNiB9IGZyb20gXCIuLi8uLi91dGlsL3dyaXRlLXVpbnQxNi5qc1wiO1xyXG5pbXBvcnQgeyB3cml0ZVVpbnQzMiB9IGZyb20gXCIuLi8uLi91dGlsL3dyaXRlLXVpbnQzMi5qc1wiO1xyXG5pbXBvcnQgeyB3cml0ZVVpbnQ4IH0gZnJvbSBcIi4uLy4uL3V0aWwvd3JpdGUtdWludDguanNcIjtcclxuaW1wb3J0IHsgc3RyaW5nVG9VdGYxNiwgc3RyaW5nVG9VdGYzMiwgc3RyaW5nVG9VdGY4LCB1dGYxNlRvU3RyaW5nTCwgdXRmMzJUb1N0cmluZ0wsIHV0ZjhUb1N0cmluZ0wgfSBmcm9tIFwiLi4vc3RyaW5nLmpzXCI7XHJcbmltcG9ydCB7IGZpbmFsaXplVHlwZSB9IGZyb20gXCIuL2ZpbmFsaXplLmpzXCI7XHJcbmltcG9ydCB7IF9lbWJpbmRfcmVnaXN0ZXIgfSBmcm9tIFwiLi9yZWdpc3Rlci5qc1wiO1xyXG5pbXBvcnQgeyBXaXJlQ29udmVyc2lvblJlc3VsdCB9IGZyb20gXCIuL3R5cGVzLmpzXCI7XHJcblxyXG4vLyBTaGFyZWQgYmV0d2VlbiBzdGQ6OnN0cmluZyBhbmQgc3RkOjp3c3RyaW5nXHJcbmV4cG9ydCBmdW5jdGlvbiBfZW1iaW5kX3JlZ2lzdGVyX3N0ZF9zdHJpbmdfYW55KGltcGw6IEluc3RhbnRpYXRlZFdhc2k8e30+LCB0eXBlUHRyOiBudW1iZXIsIGNoYXJXaWR0aDogMSB8IDIgfCA0LCBuYW1lUHRyOiBudW1iZXIpOiB2b2lkIHtcclxuXHJcbiAgICBjb25zdCB1dGZUb1N0cmluZ0wgPSAoY2hhcldpZHRoID09IDEpID8gdXRmOFRvU3RyaW5nTCA6IChjaGFyV2lkdGggPT0gMikgPyB1dGYxNlRvU3RyaW5nTCA6IHV0ZjMyVG9TdHJpbmdMO1xyXG4gICAgY29uc3Qgc3RyaW5nVG9VdGYgPSAoY2hhcldpZHRoID09IDEpID8gc3RyaW5nVG9VdGY4IDogKGNoYXJXaWR0aCA9PSAyKSA/IHN0cmluZ1RvVXRmMTYgOiBzdHJpbmdUb1V0ZjMyO1xyXG4gICAgY29uc3QgVWludEFycmF5ID0gKGNoYXJXaWR0aCA9PSAxKSA/IFVpbnQ4QXJyYXkgOiAoY2hhcldpZHRoID09IDIpID8gVWludDE2QXJyYXkgOiBVaW50MzJBcnJheTtcclxuICAgIGNvbnN0IHdyaXRlVWludCA9IChjaGFyV2lkdGggPT0gMSkgPyB3cml0ZVVpbnQ4IDogKGNoYXJXaWR0aCA9PSAyKSA/IHdyaXRlVWludDE2IDogd3JpdGVVaW50MzI7XHJcblxyXG5cclxuICAgIF9lbWJpbmRfcmVnaXN0ZXIoaW1wbCwgbmFtZVB0ciwgYXN5bmMgKG5hbWUpID0+IHtcclxuXHJcbiAgICAgICAgY29uc3QgZnJvbVdpcmVUeXBlID0gKHB0cjogbnVtYmVyKSA9PiB7XHJcbiAgICAgICAgICAgIC8vIFRoZSB3aXJlIHR5cGUgaXMgYSBwb2ludGVyIHRvIGEgXCJzdHJ1Y3RcIiAobm90IHJlYWxseSBhIHN0cnVjdCBpbiB0aGUgdXN1YWwgc2Vuc2UuLi5cclxuICAgICAgICAgICAgLy8gZXhjZXB0IG1heWJlIGluIG5ld2VyIEMgdmVyc2lvbnMgSSBndWVzcykgd2hlcmUgXHJcbiAgICAgICAgICAgIC8vIHRoZSBmaXJzdCBmaWVsZCBpcyBhIHNpemVfdCByZXByZXNlbnRpbmcgdGhlIGxlbmd0aCxcclxuICAgICAgICAgICAgLy8gQW5kIHRoZSBzZWNvbmQgXCJmaWVsZFwiIGlzIHRoZSBzdHJpbmcgZGF0YSBpdHNlbGYsXHJcbiAgICAgICAgICAgIC8vIGZpbmFsbHkgYWxsIGVuZGVkIHdpdGggYW4gZXh0cmEgbnVsbCBieXRlLlxyXG4gICAgICAgICAgICBsZXQgbGVuZ3RoID0gcmVhZFNpemVUKGltcGwsIHB0cik7XHJcbiAgICAgICAgICAgIGxldCBwYXlsb2FkID0gcHRyICsgZ2V0U2l6ZVRTaXplKGltcGwpO1xyXG4gICAgICAgICAgICBsZXQgc3RyOiBzdHJpbmcgPSBcIlwiO1xyXG4gICAgICAgICAgICBsZXQgZGVjb2RlU3RhcnRQdHIgPSBwYXlsb2FkO1xyXG4gICAgICAgICAgICBzdHIgPSB1dGZUb1N0cmluZ0woaW1wbCwgZGVjb2RlU3RhcnRQdHIsIGxlbmd0aCk7XHJcblxyXG4gICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAganNWYWx1ZTogc3RyLFxyXG4gICAgICAgICAgICAgICAgd2lyZVZhbHVlOiBwdHIsXHJcbiAgICAgICAgICAgICAgICBzdGFja0Rlc3RydWN0b3I6ICgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAvLyBUaGlzIGNhbGwgdG8gX2ZyZWUgaGFwcGVucyBiZWNhdXNlIEVtYmluZCBjYWxscyBtYWxsb2MgZHVyaW5nIGl0cyB0b1dpcmVUeXBlIGZ1bmN0aW9uLlxyXG4gICAgICAgICAgICAgICAgICAgIC8vIFN1cmVseSB0aGVyZSdzIGEgd2F5IHRvIGF2b2lkIHRoaXMgY29weSBvZiBhIGNvcHkgb2YgYSBjb3B5IHRob3VnaCwgcmlnaHQ/IFJpZ2h0P1xyXG4gICAgICAgICAgICAgICAgICAgIGltcGwuZXhwb3J0cy5mcmVlKHB0cik7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgY29uc3QgdG9XaXJlVHlwZSA9IChzdHI6IHN0cmluZyk6IFdpcmVDb252ZXJzaW9uUmVzdWx0PG51bWJlciwgc3RyaW5nPiA9PiB7XHJcblxyXG4gICAgICAgICAgICBjb25zdCB2YWx1ZUFzQXJyYXlCdWZmZXJJbkpTID0gbmV3IFVpbnRBcnJheShzdHJpbmdUb1V0ZihzdHIpKTtcclxuXHJcbiAgICAgICAgICAgIC8vIElzIGl0IG1vcmUgb3IgbGVzcyBjbGVhciB3aXRoIGFsbCB0aGVzZSB2YXJpYWJsZXMgZXhwbGljaXRseSBuYW1lZD9cclxuICAgICAgICAgICAgLy8gSG9wZWZ1bGx5IG1vcmUsIGF0IGxlYXN0IHNsaWdodGx5LlxyXG4gICAgICAgICAgICBjb25zdCBjaGFyQ291bnRXaXRob3V0TnVsbCA9IHZhbHVlQXNBcnJheUJ1ZmZlckluSlMubGVuZ3RoO1xyXG4gICAgICAgICAgICBjb25zdCBjaGFyQ291bnRXaXRoTnVsbCA9IGNoYXJDb3VudFdpdGhvdXROdWxsICsgMTtcclxuXHJcbiAgICAgICAgICAgIGNvbnN0IGJ5dGVDb3VudFdpdGhvdXROdWxsID0gY2hhckNvdW50V2l0aG91dE51bGwgKiBjaGFyV2lkdGg7XHJcbiAgICAgICAgICAgIGNvbnN0IGJ5dGVDb3VudFdpdGhOdWxsID0gY2hhckNvdW50V2l0aE51bGwgKiBjaGFyV2lkdGg7XHJcblxyXG4gICAgICAgICAgICAvLyAxLiAobSlhbGxvY2F0ZSBzcGFjZSBmb3IgdGhlIHN0cnVjdCBhYm92ZVxyXG4gICAgICAgICAgICBjb25zdCB3YXNtU3RyaW5nU3RydWN0ID0gaW1wbC5leHBvcnRzLm1hbGxvYyhnZXRTaXplVFNpemUoaW1wbCkgKyBieXRlQ291bnRXaXRoTnVsbCk7XHJcblxyXG4gICAgICAgICAgICAvLyAyLiBXcml0ZSB0aGUgbGVuZ3RoIG9mIHRoZSBzdHJpbmcgdG8gdGhlIHN0cnVjdFxyXG4gICAgICAgICAgICBjb25zdCBzdHJpbmdTdGFydCA9IHdhc21TdHJpbmdTdHJ1Y3QgKyBnZXRTaXplVFNpemUoaW1wbCk7XHJcbiAgICAgICAgICAgIHdyaXRlU2l6ZVQoaW1wbCwgd2FzbVN0cmluZ1N0cnVjdCwgY2hhckNvdW50V2l0aG91dE51bGwpO1xyXG5cclxuICAgICAgICAgICAgLy8gMy4gV3JpdGUgdGhlIHN0cmluZyBkYXRhIHRvIHRoZSBzdHJ1Y3RcclxuICAgICAgICAgICAgY29uc3QgZGVzdGluYXRpb24gPSBuZXcgVWludEFycmF5KGltcGwuZXhwb3J0cy5tZW1vcnkuYnVmZmVyLCBzdHJpbmdTdGFydCwgYnl0ZUNvdW50V2l0aG91dE51bGwpO1xyXG4gICAgICAgICAgICBkZXN0aW5hdGlvbi5zZXQodmFsdWVBc0FycmF5QnVmZmVySW5KUyk7XHJcblxyXG4gICAgICAgICAgICAvLyA0LiBXcml0ZSBhIG51bGwgYnl0ZVxyXG4gICAgICAgICAgICB3cml0ZVVpbnQoaW1wbCwgc3RyaW5nU3RhcnQgKyBieXRlQ291bnRXaXRob3V0TnVsbCwgMCk7XHJcblxyXG4gICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgc3RhY2tEZXN0cnVjdG9yOiAoKSA9PiBpbXBsLmV4cG9ydHMuZnJlZSh3YXNtU3RyaW5nU3RydWN0KSxcclxuICAgICAgICAgICAgICAgIHdpcmVWYWx1ZTogd2FzbVN0cmluZ1N0cnVjdCxcclxuICAgICAgICAgICAgICAgIGpzVmFsdWU6IHN0clxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIGZpbmFsaXplVHlwZShpbXBsLCBuYW1lLCB7XHJcbiAgICAgICAgICAgIHR5cGVJZDogdHlwZVB0cixcclxuICAgICAgICAgICAgZnJvbVdpcmVUeXBlLFxyXG4gICAgICAgICAgICB0b1dpcmVUeXBlLFxyXG4gICAgICAgIH0pO1xyXG4gICAgfSk7XHJcbn1cclxuIl19