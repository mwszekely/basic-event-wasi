import { parseArray } from "../_private/iovec.js";
import { EBADF, ESUCCESS } from "../errno.js";
import type { FileDescriptor } from "../types.js";
import { writeSizeT } from "../util/write-sizet.js";
import type { InstantiatedWasm } from "../wasm.js";

export interface FileDescriptorReadEventDetail {
    /**
     * The [file descriptor](https://en.wikipedia.org/wiki/File_descriptor), a 0-indexed number describing where the data is going to/coming from.
     * 
     * It's more-or-less [universally expected](https://en.wikipedia.org/wiki/Standard_stream) that 0 is for input, 1 for output, and 2 for errors,
     * so you can map 1 to `console.log` and 2 to `console.error`, with others handled with the various file-opening calls. 
     */
    readonly fileDescriptor: number;

    /**
     * The data you want to write to this fileDescriptor if `preventDefault` is called.
     * 
     * If it is longer than the buffers allow, then the next time
     * this event is dispatched, `data` will be pre-filled with
     * whatever was leftover. You can then add more if you want.
     * 
     * Once all of `data` has been read (keeping in mind how newlines
     * can "pause" the reading of `data` until some time in the future
     * and other formatted input quirks), including if no data is ever
     * added in the first place, it's understood to be EOF.
     */
    readonly data: (Uint8Array | string)[];
}


const FdReadInfoSymbol = Symbol();
interface FdReadInfo {
    data: (Uint8Array | string)[];
}
interface WithFdReadInfo {
    [FdReadInfoSymbol]: FdReadInfo;
}

export class FileDescriptorReadEvent extends CustomEvent<FileDescriptorReadEventDetail> {


    constructor(fileDescriptor: number, data: (Uint8Array | string)[]) {
        super("fd_read", {
            bubbles: false,
            cancelable: true,
            detail: {
                fileDescriptor,
                data
            }
        });
    }
}

/** POSIX readv */
export function fd_read(this: InstantiatedWasm, fd: FileDescriptor, iov: number, iovcnt: number, pnum: number): number {
    let nWritten = 0;
    const buffers = parseArray(this, iov, iovcnt);

    const this2 = ((this as unknown as WithFdReadInfo)[FdReadInfoSymbol] ??= { data: [] });

    const event = new FileDescriptorReadEvent(fd, this2.data);
    if (this.dispatchEvent(event)) {
        if (fd === 0) {
            if (event.detail.data.length == 0) {
                // Default behavior for stdin--use window.prompt.
                // TODO: WASM promises when those are available
                console.assert(event.detail.data.length == 0);
                const str = (window.prompt() ?? "") + "\n";
                event.detail.data.push(str);
            }
        }
        else {
            return EBADF;
        }
    }

    // Write the user-provided data to the buffer
    let outBuffIndex = 0;
    let inBuffIndex = 0;
    let outBuff: Uint8Array = buffers[outBuffIndex].uint8;
    let inBuff: Uint8Array | string = event.detail.data[inBuffIndex];

    while (true) {

        if (typeof inBuff == "string")
            inBuff = new TextEncoder().encode(inBuff);

        if (outBuff == null || inBuff == null)
            break;

        // Write what we can from inBuff to outBuff.

        const lengthRemainingToWrite = inBuff.byteLength;
        const lengthAvailableToWrite = outBuff.byteLength;
        const lengthToWrite = Math.min(lengthAvailableToWrite, lengthRemainingToWrite);
        outBuff.set(inBuff.subarray(0, lengthToWrite));

        // Now "discard" what we wrote
        // (this doesn't actually do any heavy memory moves or anything,
        // it's just creating new views over the same `ArrayBuffer`s).
        inBuff = inBuff.subarray(lengthToWrite);
        outBuff = outBuff.subarray(lengthToWrite);

        // Now see where we're at with each buffer.
        // If we ran out of input data, move to the next input buffer.
        if (lengthRemainingToWrite < lengthAvailableToWrite) {
            ++inBuffIndex;
            inBuff = event.detail.data[inBuffIndex];
        }

        // If we ran out of output space, move to the next output buffer.
        if (lengthAvailableToWrite < lengthRemainingToWrite) {
            ++outBuffIndex;
            outBuff = buffers[outBuffIndex]?.uint8;
        }
        nWritten += lengthToWrite;
    }

    const d: (string | Uint8Array)[] = [];
    if (inBuff && inBuff.byteLength)
        d.push(inBuff);
    if (event.detail.data.length > 0)
        d.push(...event.detail.data.slice(inBuffIndex + 1));

    this2.data = d;

    writeSizeT(this, pnum, nWritten);

    return ESUCCESS;
}
