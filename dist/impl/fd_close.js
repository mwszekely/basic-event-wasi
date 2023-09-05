import "./__custom_event.js";
export class FileDescriptorCloseEvent extends CustomEvent {
    constructor(fileDescriptor) {
        super("FileDescriptorCloseEvent", { cancelable: true, detail: { fileDescriptor } });
    }
}
/** POSIX close */
export function fd_close(fd) {
    const event = new FileDescriptorCloseEvent(fd);
    debugger;
    if (this.dispatchEvent(event)) {
    }
}
