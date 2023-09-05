import { FileDescriptor, PrivateImpl } from "../../types.js";
import { errorno } from "../errorno.js";
import { parseArray } from "../iovec.js";
import "./custom_event.js";

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
        super("FileDescriptorWriteEvent", { bubbles: false, cancelable: true, detail: { data, fileDescriptor } });
    }
    asString(label: string): string {
        return this.detail.data.map((d, index) => {
            let decoded = getTextDecoder(label).decode(d);
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
export function fd_write(this: PrivateImpl, fd: FileDescriptor, iov: number, iovcnt: number, pnum: number) {

    let nWritten = 0;
    const gen = parseArray(this, iov, iovcnt);

    // Get all the data to write in its separate buffers
    const asTypedArrays = [...gen].map(({ bufferStart, bufferLength }) => { nWritten += bufferLength; return new Uint8Array(this.getMemory().buffer, bufferStart, bufferLength) });

    const event = new FileDescriptorWriteEvent(fd, asTypedArrays);
    if (this.dispatchEvent(event)) {
        const str = event.asString("utf-8");
        if (fd == 1)
            console.log(str);
        else if (fd == 2)
            console.error(str);
        else
            return errorno.badf;
    }

    this.writeUint32(pnum, nWritten);

    return 0;
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