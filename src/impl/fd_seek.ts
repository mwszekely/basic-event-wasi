import { FileDescriptor, Pointer, PrivateImpl } from "../types.js";
import "./__custom_event.js";
import { errorno } from "./errorno.js";

export interface FileDescriptorSeekEventDetail {
    /**
     * The [file descriptor](https://en.wikipedia.org/wiki/File_descriptor), a 0-indexed number describing where the data is going to/coming from.
     * 
     * It's more-or-less [universally expected](https://en.wikipedia.org/wiki/Standard_stream) that 0 is for input, 1 for output, and 2 for errors,
     * so you can map 1 to `console.log` and 2 to `console.error`. 
     */
    fileDescriptor: number;
}

export class FileDescriptorSeekEvent extends CustomEvent<FileDescriptorSeekEventDetail> {
    constructor(fileDescriptor: number) {
        super("FileDescriptorSeekEvent", { cancelable: true, detail: { fileDescriptor } });
    }
}

/** POSIX lseek */
export function fd_seek(this: PrivateImpl, fd: FileDescriptor, offset: number, whence: number, offsetOut: Pointer<number>) {
    debugger;

    switch (fd) {
        case 0:
            break;
        case 1:
            break;
        case 2:
            break;
        default:
            if (this.dispatchEvent(new FileDescriptorSeekEvent(fd)))
                return errorno.badf;
    }


    return 0;
}
