import { FileDescriptor, PrivateImpl } from "../../types.js";
import { writeUint32, writeUint8 } from "../../util.js";
import "../custom_event.js";
import { Iovec, parseArray } from "../iovec.js";

export interface FileDescriptorReadEventDetail {
    /**
     * The [file descriptor](https://en.wikipedia.org/wiki/File_descriptor), a 0-indexed number describing where the data is going to/coming from.
     * 
     * It's more-or-less [universally expected](https://en.wikipedia.org/wiki/Standard_stream) that 0 is for input, 1 for output, and 2 for errors,
     * so you can map 1 to `console.log` and 2 to `console.error`, with others handled with the various file-opening calls. 
     */
    fileDescriptor: number;

    requestedBuffers: Iovec[];

    readIntoMemory(buffers: (Uint8Array)[]): void;
}

export class FileDescriptorReadEvent extends CustomEvent<FileDescriptorReadEventDetail> {
    private _bytesWritten = 0;

    constructor(impl: PrivateImpl, fileDescriptor: number, requestedBufferInfo: Iovec[]) {
        super("FileDescriptorReadEvent", {
            bubbles: false,
            cancelable: true,
            detail: {
                fileDescriptor,
                requestedBuffers: requestedBufferInfo,
                readIntoMemory: (inputBuffers) => {
                    // 100% untested, probably doesn't work if I'm being honest
                    for (let i = 0; i < requestedBufferInfo.length; ++i) {
                        if (i >= inputBuffers.length)
                            break;
                        const buffer = inputBuffers[i];
                        for (let j = 0; j < Math.min(buffer.byteLength, inputBuffers[j].byteLength); ++j) {
                            writeUint8(impl.instance, requestedBufferInfo[i].bufferStart + j, inputBuffers[i][j]);
                            ++this._bytesWritten;
                        }
                    }
                }
            }
        });
    }
    bytesWritten() {
        return this._bytesWritten;
    }
}

export class UnhandledFileReadEvent extends Error {
    constructor(fd: number) {
        super(`Unhandled read to file descriptor #${fd}.`);
    }
}


/** POSIX readv */
export function fd_read(this: PrivateImpl, fd: FileDescriptor, iov: number, iovcnt: number, pnum: number) {

    let nWritten = 0;
    const gen = parseArray(this, iov, iovcnt);

    // Get all the data to read in its separate buffers
    //const asTypedArrays = [...gen].map(({ bufferStart, bufferLength }) => { nWritten += bufferLength; return new Uint8Array(this.getMemory().buffer, bufferStart, bufferLength) });

    const event = new FileDescriptorReadEvent(this, fd, [...gen]);
    if (this.dispatchEvent(event)) {
        nWritten = 0;
        /*if (fd == 0) {

        }
        else
            return errorno.badf;*/
    }
    else {
        nWritten = event.bytesWritten();
    }

    writeUint32(this.instance, pnum, nWritten);

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