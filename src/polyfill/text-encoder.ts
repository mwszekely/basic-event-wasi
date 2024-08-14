
globalThis.TextEncoder ??= class TD implements TextEncoderCommon {
    encoding = 'utf8';
    encodeInto(source: string, destination: Uint8Array): TextEncoderEncodeIntoResult {

        let read = 0;
        let written = 0;

        let byteIndex = 0;
        for (const ch of source) {
            if (ch.codePointAt(0)! >= 0x80)
                throw new Error("Not implemented: non-ASCII characters in Worklets");
            destination[byteIndex++] = ch.codePointAt(0)!;
            ++read;
            ++written;
        }

        return {
            read,
            written
        }
    }
    encode(input?: string): Uint8Array {
        if (!input)
            return new Uint8Array();

        const b = new Uint8Array(new ArrayBuffer(input.length));
        for (let i = 0; i < input.length; ++i) {
            if (input[i].charCodeAt(0) < 0x80)
                b[i] = input[i].charCodeAt(0)!
        }
        return b;
    }
}

