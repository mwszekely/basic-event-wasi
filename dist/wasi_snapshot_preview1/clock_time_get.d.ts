import { InstantiatedWasi } from "../instantiated-wasi.js";
export declare enum ClockId {
    REALTIME = 0,
    MONOTONIC = 1,
    PROCESS_CPUTIME_ID = 2,
    THREAD_CPUTIME_ID = 3
}
export declare function clock_time_get(this: InstantiatedWasi<{}>, clk_id: number, _precision: number, outPtr: number): number;
//# sourceMappingURL=clock_time_get.d.ts.map