import { FileDescriptor, PrivateImpl } from "../types.js";
import "./__custom_event.js";
import { errorno } from "./errorno.js";
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
export declare class FileDescriptorWriteEvent extends CustomEvent<FileDescriptorWriteEventDetail> {
    constructor(fileDescriptor: number, data: Uint8Array[]);
    asString(label: string): string;
}
export declare class UnhandledFileWriteEvent extends Error {
    constructor(fd: number);
}
/** POSIX writev */
export declare function fd_write(this: PrivateImpl, fd: FileDescriptor, iov: number, iovcnt: number, pnum: number): 0 | errorno.badf;
