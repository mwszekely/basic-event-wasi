import { errorno } from "./errorno.js";
export class FileDescriptorSeekEvent extends CustomEvent {
    constructor(fileDescriptor) {
        super("FileDescriptorSeekEvent", { cancelable: true, detail: { fileDescriptor } });
    }
}
/** POSIX lseek */
export function fd_seek(fd, offset, whence, offsetOut) {
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
