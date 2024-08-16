import { EBADF, EINVAL, EOVERFLOW, ESPIPE, ESUCCESS } from "../errno.js";
import type { FileDescriptor } from "../types.js";
import { writePointer } from "../util/write-pointer.js";
import type { InstantiatedWasm } from "../wasm.js";

export interface FileDescriptorSeekEventDetail {
    /**
     * The [file descriptor](https://en.wikipedia.org/wiki/File_descriptor), a 0-indexed number describing where the data is going to/coming from.
     */
    readonly fileDescriptor: number;

    /**
     * The number of bytes to move the current position by
     */
    readonly offset: number;

    /** 
     * Whether to move ...
     * * ...to an absolute position (WHENCE_SET)
     * * ...relative to the current position (WHENCE_CUR)
     * * ...relative to the end of the file (WHENCE_END)
     */
    readonly whence: SeekWhence;

    /**
     * If you set this value and call `preventDefault`, it will be returned by `fd_seek`. Otherwise ESUCCESS will be returned
     */
    error?: FileSeekErrors;

    /**
     * If `preventDefault` is called, this must be set to the new position in the file (or `error` must be set).
     */
    newPosition: number;
}

export type FileSeekErrors = typeof ESPIPE | typeof EBADF | typeof EINVAL | typeof EOVERFLOW | typeof ESUCCESS;

export class FileDescriptorSeekEvent extends CustomEvent<FileDescriptorSeekEventDetail> {
    constructor(fileDescriptor: number, offset: number, whence: SeekWhence) {
        super("fd_seek", { cancelable: true, detail: { fileDescriptor, offset, whence, newPosition: 0, error: undefined } });
    }
}

export const WHENCE_SET = 0;
export const WHENCE_CUR = 1;
export const WHENCE_END = 2;
export type SeekWhence = typeof WHENCE_SET | typeof WHENCE_CUR | typeof WHENCE_END;

/** POSIX lseek */
export function fd_seek(this: InstantiatedWasm, fd: FileDescriptor, offset: number, whence: SeekWhence, offsetOut: number): FileSeekErrors {
    const event = new FileDescriptorSeekEvent(fd, offset, whence);
    if (this.dispatchEvent(event)) {
        switch (fd) {
            case 0:
            case 1:
            case 2: return ESPIPE;
            default: return EBADF;
        }
    }
    else {
        writePointer(this, offsetOut, event.detail.newPosition);
        return event.detail.error ?? ESUCCESS;
    }
}
