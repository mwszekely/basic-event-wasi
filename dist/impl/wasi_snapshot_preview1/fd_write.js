import "../custom_event.js";
import { errorno } from "../errorno.js";
import { parseArray } from "../iovec.js";
export class FileDescriptorWriteEvent extends CustomEvent {
    constructor(fileDescriptor, data) {
        super("FileDescriptorWriteEvent", { bubbles: false, cancelable: true, detail: { data, fileDescriptor } });
    }
    asString(label) {
        return this.detail.data.map((d, index) => {
            let decoded = getTextDecoder(label).decode(d);
            if (decoded == "\0" && index == this.detail.data.length - 1)
                return "";
            return decoded;
        }).join("");
    }
}
export class UnhandledFileWriteEvent extends Error {
    constructor(fd) {
        super(`Unhandled write to file descriptor #${fd}.`);
    }
}
/** POSIX writev */
export function fd_write(fd, iov, iovcnt, pnum) {
    let nWritten = 0;
    const gen = parseArray(this, iov, iovcnt);
    // Get all the data to write in its separate buffers
    const asTypedArrays = [...gen].map(({ bufferStart, bufferLength }) => { nWritten += bufferLength; return new Uint8Array(this.getMemory().buffer, bufferStart, bufferLength); });
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
const textDecoders = new Map();
function getTextDecoder(label) {
    let ret = textDecoders.get(label);
    if (!ret) {
        ret = new TextDecoder(label);
        textDecoders.set(label, ret);
    }
    return ret;
}
