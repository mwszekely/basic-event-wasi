import { FileDescriptor, PrivateImpl } from "../../types.js";
import { Iovec } from "../iovec.js";
import "./custom_event.js";
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
export declare class FileDescriptorReadEvent extends CustomEvent<FileDescriptorReadEventDetail> {
    private _bytesWritten;
    constructor(impl: PrivateImpl, fileDescriptor: number, requestedBufferInfo: Iovec[]);
    bytesWritten(): number;
}
export declare class UnhandledFileReadEvent extends Error {
    constructor(fd: number);
}
/** POSIX readv */
export declare function fd_read(this: PrivateImpl, fd: FileDescriptor, iov: number, iovcnt: number, pnum: number): number;
