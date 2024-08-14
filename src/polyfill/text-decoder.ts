
globalThis.TextDecoder ??= class TD implements TextDecoderCommon {
    encoding = 'utf8';
    fatal = false;
    ignoreBOM = false;
    decode(input?: AllowSharedBufferSource, _options?: TextDecodeOptions): string {
        let i = 0;
        if (!input)
            return "";

        const input2 = new Uint8Array((input instanceof ArrayBuffer) ? input : input.buffer);

        let ret = "";
        while (i < input.byteLength) {
            const byte = input2[i];
            if (byte < 0x80)
                ret += String.fromCharCode(byte);
            else
                throw new Error("Not implemented: non-ASCII characters in Worklets")
            ++i;
        }

        return ret;
    }
}

