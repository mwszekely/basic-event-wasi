import { writeUint32, writeUint8 } from "../../util.js";
import "../custom_event.js";
import { parseArray } from "../iovec.js";
export class FileDescriptorReadEvent extends CustomEvent {
    _bytesWritten = 0;
    constructor(impl, fileDescriptor, requestedBufferInfo) {
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
    constructor(fd) {
        super(`Unhandled read to file descriptor #${fd}.`);
    }
}
/** POSIX readv */
export function fd_read(fd, iov, iovcnt, pnum) {
    debugger;
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
const textDecoders = new Map();
function getTextDecoder(label) {
    let ret = textDecoders.get(label);
    if (!ret) {
        ret = new TextDecoder(label);
        textDecoders.set(label, ret);
    }
    return ret;
}
