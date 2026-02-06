import { readUint16 } from "../util/read-uint16.js";
import { readUint32 } from "../util/read-uint32.js";
import { readUint8 } from "../util/read-uint8.js";
import { InstantiatedWasm } from "../wasm.js";

/**
 * TODO: Can't C++ identifiers include non-ASCII characters? 
 * Why do all the type decoding functions use this?
 */
export function readLatin1String(impl: InstantiatedWasm, ptr: number): string {
    let ret = "";
    let nextByte: number
    // eslint-disable-next-line no-cond-assign
    while (nextByte = readUint8(impl, ptr++)) {
        ret += String.fromCharCode(nextByte);
    }
    return ret;
}

// Note: In Worklets, `TextDecoder` and `TextEncoder` need a polyfill.
const utf8Decoder = new TextDecoder("utf-8");
const utf16Decoder = new TextDecoder("utf-16le");
const utf8Encoder = new TextEncoder();

/**
 * Decodes a null-terminated UTF-8 string. If you know the length of the string, you can save time by using `utf8ToStringL` instead.
 * 
 * @param impl 
 * @param ptr 
 * @returns 
 */
export function utf8ToStringZ(impl: InstantiatedWasm, ptr: number): string {
    const start = ptr;
    let end = start;

    while (readUint8(impl, end++) != 0);

    return utf8ToStringL(impl, start, end - start - 1);
}

export function utf16ToStringZ(impl: InstantiatedWasm, ptr: number): string {
    const start = ptr;
    let end = start;

    while (readUint16(impl, end) != 0) { end += 2; }

    return utf16ToStringL(impl, start, end - start - 1);
}
export function utf32ToStringZ(impl: InstantiatedWasm, ptr: number): string {
    const start = ptr;
    let end = start;

    while (readUint32(impl, end) != 0) { end += 4; }

    return utf32ToStringL(impl, start, end - start - 1);
}

export function utf8ToStringL(impl: InstantiatedWasm, ptr: number, byteCount: number): string {
    return utf8Decoder.decode(new Uint8Array(impl.exports.memory.buffer, ptr, byteCount));
}
export function utf16ToStringL(impl: InstantiatedWasm, ptr: number, wcharCount: number): string {
    return utf16Decoder.decode(new Uint8Array(impl.exports.memory.buffer, ptr, wcharCount * 2));
}
export function utf32ToStringL(impl: InstantiatedWasm, ptr: number, wcharCount: number): string {
    const chars = (new Uint32Array(impl.exports.memory.buffer, ptr, wcharCount));
    let ret = "";
    for (const ch of chars) {
        ret += String.fromCharCode(ch);
    }
    return ret;
}

export function stringToUtf8(string: string): ArrayBuffer {
    return utf8Encoder.encode(string).buffer;
}

export function stringToUtf16(string: string): ArrayBuffer {
    const ret = new Uint16Array(new ArrayBuffer(string.length * 2));
    for (let i = 0; i < ret.length; ++i) {
        ret[i] = string.charCodeAt(i);
    }
    return ret.buffer;
}

export function stringToUtf32(string: string): ArrayBuffer {
    let trueLength = 0;
    // The worst-case string is one of all surrogate pairs.
    // E.G. "🤓".length is 2, but it only takes one char32_t.
    // We'll allocate the full length of the string,
    // but we might end up needing to shrink it afterwards.
    const temp = new Uint32Array(new ArrayBuffer(string.length * 4));
    for (const ch of string) {
        temp[trueLength] = ch.codePointAt(0)!;
        ++trueLength;
    }

    return temp.buffer.slice(0, trueLength * 4);
}

/**
 * Used when sending strings from JS to WASM.
 * 
 * 
 * @param str 
 * @returns 
 */
export function lengthBytesUTF8(str: string): number {
    let len = 0;
    for (let i = 0; i < str.length; ++i) {
        const c = str.codePointAt(i)!;
        if (c <= 0x7F)
            len++;
        else if (c <= 0x7FF)
            len += 2;
        else if (c <= 0x7FFF)
            len += 3;
        else {
            len += 4;
            ++i;
        }
    }
    return len;
}