import { FileDescriptor, PrivateImpl } from "../types.js";
import "./__custom_event.js";
export interface FileDescriptorCloseEventDetail {
    /**
     * The [file descriptor](https://en.wikipedia.org/wiki/File_descriptor), a 0-indexed number describing where the data is going to/coming from.
     *
     * It's more-or-less [universally expected](https://en.wikipedia.org/wiki/Standard_stream) that 0 is for input, 1 for output, and 2 for errors,
     * so you can map 1 to `console.log` and 2 to `console.error`.
     */
    fileDescriptor: number;
}
export declare class FileDescriptorCloseEvent extends CustomEvent<FileDescriptorCloseEventDetail> {
    constructor(fileDescriptor: number);
}
/** POSIX close */
export declare function fd_close(this: PrivateImpl, fd: FileDescriptor): void;
