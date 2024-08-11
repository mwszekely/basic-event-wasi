import { EINVAL, ENOSYS, ESUCCESS } from "../errno.js";
import { InstantiatedWasi } from "../instantiated-wasi.js";
import { writeUint64 } from "../util/write-uint64.js";

export enum ClockId {
    REALTIME = 0,
    MONOTONIC = 1,
    PROCESS_CPUTIME_ID = 2,
    THREAD_CPUTIME_ID = 3
}

const p = (globalThis.performance);

export function clock_time_get(this: InstantiatedWasi<{}>, clk_id: number, _precision: number, outPtr: number): number {

    let nowMs: number;
    switch (clk_id) {
        case ClockId.REALTIME:
            nowMs = Date.now();
            break;
        case ClockId.MONOTONIC:
            if (p == null) return ENOSYS;   // TODO: Possible to be null in Worklets?
            nowMs = p.now();
            break;
        case ClockId.PROCESS_CPUTIME_ID:
        case ClockId.THREAD_CPUTIME_ID:
            return ENOSYS;
        default: return EINVAL;
    }
    const nowNs = BigInt(Math.round(nowMs * 1000 * 1000));
    writeUint64(this, outPtr, nowNs);

    return ESUCCESS;
}