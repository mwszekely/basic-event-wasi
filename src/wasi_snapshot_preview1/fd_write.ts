import { parseArray } from "../_private/iovec.js";
import { EBADF, ESUCCESS } from "../errno.js";
import type { FileDescriptor } from "../types.js";
import { writeUint32 } from "../util/write-uint32.js";
import type { InstantiatedWasm } from "../wasm.js";

export interface FileDescriptorWriteEventDetail {
    /**
     * The [file descriptor](https://en.wikipedia.org/wiki/File_descriptor), a 0-indexed number describing where the data is going to/coming from.
     * 
     * It's more-or-less [universally expected](https://en.wikipedia.org/wiki/Standard_stream) that 0 is for input, 1 for output, and 2 for errors,
     * so you can map 1 to `console.log` and 2 to `console.error`, with others handled with the various file-opening calls. 
     */
    fileDescriptor: number;
    data: Uint8Array[];
}

export class FileDescriptorWriteEvent extends CustomEvent<FileDescriptorWriteEventDetail> {
    constructor(fileDescriptor: number, data: Uint8Array[]) {
        super("fd_write", { bubbles: false, cancelable: true, detail: { data, fileDescriptor } });
    }
    asString(label: string): string {
        return this.detail.data.map((d, index) => {
            const decoded = getTextDecoder(label).decode(d);
            if (decoded == "\0" && index == this.detail.data.length - 1)
                return "";
            return decoded;
        }).join("");
    }
}

export class UnhandledFileWriteEvent extends Error {
    constructor(fd: number) {
        super(`Unhandled write to file descriptor #${fd}.`);
    }
}


/** POSIX writev */
export function fd_write(this: InstantiatedWasm, fd: FileDescriptor, iov: number, iovcnt: number, pnum: number): typeof ESUCCESS | typeof EBADF {

    let nWritten = 0;
    const gen = parseArray(this, iov, iovcnt);

    // Get all the data to write in its separate buffers
    const asTypedArrays = [...gen].map(({ bufferStart, bufferLength }) => { nWritten += bufferLength; return new Uint8Array(this.cachedMemoryView.buffer, bufferStart, bufferLength) });

    const event = new FileDescriptorWriteEvent(fd, asTypedArrays);
    if (this.dispatchEvent(event)) {
        const str = event.asString("utf-8");
        if (fd == 1)
            console.log(str);
        else if (fd == 2)
            console.error(str);
        else
            return EBADF;
    }

    writeUint32(this, pnum, nWritten);

    return ESUCCESS;
}


const textDecoders = new Map<string, TextDecoder>();
function getTextDecoder(label: string) {
    let ret: TextDecoder | undefined = textDecoders.get(label);
    if (!ret) {
        ret = new TextDecoder(label);
        textDecoders.set(label, ret);
    }

    return ret;
}