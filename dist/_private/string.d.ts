import { InstantiatedWasi } from "../instantiated-wasi.js";
/**
 * TODO: Can't C++ identifiers include non-ASCII characters?
 * Why do all the type decoding functions use this?
 */
export declare function readLatin1String(impl: InstantiatedWasi<{}>, ptr: number): string;
/**
 * Decodes a null-terminated UTF-8 string. If you know the length of the string, you can save time by using `utf8ToStringL` instead.
 *
 * @param impl
 * @param ptr
 * @returns
 */
export declare function utf8ToStringZ(impl: InstantiatedWasi<{}>, ptr: number): string;
export declare function utf16ToStringZ(impl: InstantiatedWasi<{}>, ptr: number): string;
export declare function utf32ToStringZ(impl: InstantiatedWasi<{}>, ptr: number): string;
export declare function utf8ToStringL(impl: InstantiatedWasi<{}>, ptr: number, byteCount: number): string;
export declare function utf16ToStringL(impl: InstantiatedWasi<{}>, ptr: number, wcharCount: number): string;
export declare function utf32ToStringL(impl: InstantiatedWasi<{}>, ptr: number, wcharCount: number): string;
export declare function stringToUtf8(string: string): ArrayBuffer;
export declare function stringToUtf16(string: string): ArrayBuffer;
export declare function stringToUtf32(string: string): ArrayBuffer;
/**
 * Used when sending strings from JS to WASM.
 *
 *
 * @param str
 * @returns
 */
export declare function lengthBytesUTF8(str: string): number;
//# sourceMappingURL=string.d.ts.map