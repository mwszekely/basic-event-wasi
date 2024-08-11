import type { MemoryGrowthEvent } from "../env/emscripten_notify_memory_growth.js";
import type { FileDescriptorCloseEvent } from "../wasi_snapshot_preview1/fd_close.js";
import type { FileDescriptorReadEvent } from "../wasi_snapshot_preview1/fd_read.js";
import type { FileDescriptorSeekEvent } from "../wasi_snapshot_preview1/fd_seek.js";
import type { FileDescriptorWriteEvent } from "../wasi_snapshot_preview1/fd_write.js";
import type { AbortEvent } from "../wasi_snapshot_preview1/proc_exit.js";


export interface EventTypesMap {
    MemoryGrowthEvent: MemoryGrowthEvent;

    proc_exit: AbortEvent;
    fd_read: FileDescriptorReadEvent;
    fd_write: FileDescriptorWriteEvent;
    fd_seek: FileDescriptorSeekEvent;
    fd_close: FileDescriptorCloseEvent;
}
