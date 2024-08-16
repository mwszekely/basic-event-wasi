import type { FileDescriptor } from "../types.js";
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
export declare class FileDescriptorReadEvent extends CustomEvent<FileDescriptorReadEventDetail> {
    constructor(fileDescriptor: number, data: (Uint8Array | string)[]);
}
/** POSIX readv */
export declare function fd_read(this: InstantiatedWasm, fd: FileDescriptor, iov: number, iovcnt: number, pnum: number): number;
//# sourceMappingURL=fd_read.d.ts.map