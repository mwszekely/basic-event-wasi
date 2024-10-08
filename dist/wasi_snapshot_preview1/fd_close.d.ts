import type { FileDescriptor } from "../types.js";
import { InstantiatedWasm } from "../wasm.js";
export interface FileDescriptorCloseEventDetail {
    /**
     * The [file descriptor](https://en.wikipedia.org/wiki/File_descriptor), a 0-indexed number describing where the data is going to/coming from.
     *
     * It's more-or-less [universally expected](https://en.wikipedia.org/wiki/Standard_stream) that 0 is for input, 1 for output, and 2 for errors,
     * so you can map 1 to `console.log` and 2 to `console.error`.
     */
    readonly fileDescriptor: number;
}
export declare class FileDescriptorCloseEvent extends CustomEvent<FileDescriptorCloseEventDetail> {
    constructor(fileDescriptor: number);
}
/** POSIX close */
export declare function fd_close(this: InstantiatedWasm, fd: FileDescriptor): void;
//# sourceMappingURL=fd_close.d.ts.map