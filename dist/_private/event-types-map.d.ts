import type { MemoryGrowthEvent } from "../env/emscripten_notify_memory_growth.js";
import type { FileDescriptorCloseEvent } from "../wasi_snapshot_preview1/fd_close.js";
import type { FileDescriptorReadEvent } from "../wasi_snapshot_preview1/fd_read.js";
import type { FileDescriptorSeekEvent } from "../wasi_snapshot_preview1/fd_seek.js";
import type { FileDescriptorWriteEvent } from "../wasi_snapshot_preview1/fd_write.js";
import type { ProcExitEvent } from "../wasi_snapshot_preview1/proc_exit.js";
import type { EnvironGetEvent } from "./environ.js";
export interface EventTypesMapClasses {
    MemoryGrowthEvent: typeof MemoryGrowthEvent;
    proc_exit: typeof ProcExitEvent;
    fd_read: typeof FileDescriptorReadEvent;
    fd_write: typeof FileDescriptorWriteEvent;
    fd_seek: typeof FileDescriptorSeekEvent;
    fd_close: typeof FileDescriptorCloseEvent;
    environ_get: typeof EnvironGetEvent;
}
export type EventTypesMap = {
    [K in keyof EventTypesMapClasses]: InstanceType<EventTypesMapClasses[K]>;
};
//# sourceMappingURL=event-types-map.d.ts.map