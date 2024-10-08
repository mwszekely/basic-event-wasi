import { EINVAL, ENOSYS, ESUCCESS } from "../errno.js";
import { writeUint64 } from "../util/write-uint64.js";
import { InstantiatedWasm } from "../wasm.js";
export var ClockId;
(function (ClockId) {
    ClockId[ClockId["REALTIME"] = 0] = "REALTIME";
    ClockId[ClockId["MONOTONIC"] = 1] = "MONOTONIC";
    ClockId[ClockId["PROCESS_CPUTIME_ID"] = 2] = "PROCESS_CPUTIME_ID";
    ClockId[ClockId["THREAD_CPUTIME_ID"] = 3] = "THREAD_CPUTIME_ID";
})(ClockId || (ClockId = {}));
const p = (globalThis.performance);
export function clock_time_get(clk_id, _precision, outPtr) {
    let nowMs;
    switch (clk_id) {
        case +ClockId.REALTIME:
            nowMs = Date.now();
            break;
        case +ClockId.MONOTONIC:
            if (p == null)
                return ENOSYS; // TODO: Possible to be null in Worklets?
            nowMs = p.now();
            break;
        case +ClockId.PROCESS_CPUTIME_ID:
        case +ClockId.THREAD_CPUTIME_ID:
            return ENOSYS;
        default:
            return EINVAL;
    }
    const nowNs = BigInt(Math.round(nowMs * 1000 * 1000));
    writeUint64(this, outPtr, nowNs);
    return ESUCCESS;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xvY2tfdGltZV9nZXQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvd2FzaV9zbmFwc2hvdF9wcmV2aWV3MS9jbG9ja190aW1lX2dldC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUUsTUFBTSxhQUFhLENBQUM7QUFDdkQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBQ3RELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLFlBQVksQ0FBQztBQUU5QyxNQUFNLENBQU4sSUFBWSxPQUtYO0FBTEQsV0FBWSxPQUFPO0lBQ2YsNkNBQVksQ0FBQTtJQUNaLCtDQUFhLENBQUE7SUFDYixpRUFBc0IsQ0FBQTtJQUN0QiwrREFBcUIsQ0FBQTtBQUN6QixDQUFDLEVBTFcsT0FBTyxLQUFQLE9BQU8sUUFLbEI7QUFFRCxNQUFNLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUMsQ0FBQztBQUVuQyxNQUFNLFVBQVUsY0FBYyxDQUF5QixNQUFjLEVBQUUsVUFBa0IsRUFBRSxNQUFjO0lBRXJHLElBQUksS0FBYSxDQUFDO0lBQ2xCLFFBQVEsTUFBTSxFQUFFLENBQUM7UUFDYixLQUFLLENBQUMsT0FBTyxDQUFDLFFBQVE7WUFDbEIsS0FBSyxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztZQUNuQixNQUFNO1FBQ1YsS0FBSyxDQUFDLE9BQU8sQ0FBQyxTQUFTO1lBQ25CLElBQUksQ0FBQyxJQUFJLElBQUk7Z0JBQUUsT0FBTyxNQUFNLENBQUMsQ0FBRyx5Q0FBeUM7WUFDekUsS0FBSyxHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQztZQUNoQixNQUFNO1FBQ1YsS0FBSyxDQUFDLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQztRQUNqQyxLQUFLLENBQUMsT0FBTyxDQUFDLGlCQUFpQjtZQUMzQixPQUFPLE1BQU0sQ0FBQztRQUNsQjtZQUNJLE9BQU8sTUFBTSxDQUFDO0lBQ3RCLENBQUM7SUFDRCxNQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLEdBQUcsSUFBSSxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDdEQsV0FBVyxDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFFakMsT0FBTyxRQUFRLENBQUM7QUFDcEIsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEVJTlZBTCwgRU5PU1lTLCBFU1VDQ0VTUyB9IGZyb20gXCIuLi9lcnJuby5qc1wiO1xyXG5pbXBvcnQgeyB3cml0ZVVpbnQ2NCB9IGZyb20gXCIuLi91dGlsL3dyaXRlLXVpbnQ2NC5qc1wiO1xyXG5pbXBvcnQgeyBJbnN0YW50aWF0ZWRXYXNtIH0gZnJvbSBcIi4uL3dhc20uanNcIjtcclxuXHJcbmV4cG9ydCBlbnVtIENsb2NrSWQge1xyXG4gICAgUkVBTFRJTUUgPSAwLFxyXG4gICAgTU9OT1RPTklDID0gMSxcclxuICAgIFBST0NFU1NfQ1BVVElNRV9JRCA9IDIsXHJcbiAgICBUSFJFQURfQ1BVVElNRV9JRCA9IDNcclxufVxyXG5cclxuY29uc3QgcCA9IChnbG9iYWxUaGlzLnBlcmZvcm1hbmNlKTtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBjbG9ja190aW1lX2dldCh0aGlzOiBJbnN0YW50aWF0ZWRXYXNtLCBjbGtfaWQ6IG51bWJlciwgX3ByZWNpc2lvbjogbnVtYmVyLCBvdXRQdHI6IG51bWJlcik6IG51bWJlciB7XHJcblxyXG4gICAgbGV0IG5vd01zOiBudW1iZXI7XHJcbiAgICBzd2l0Y2ggKGNsa19pZCkge1xyXG4gICAgICAgIGNhc2UgK0Nsb2NrSWQuUkVBTFRJTUU6XHJcbiAgICAgICAgICAgIG5vd01zID0gRGF0ZS5ub3coKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSArQ2xvY2tJZC5NT05PVE9OSUM6XHJcbiAgICAgICAgICAgIGlmIChwID09IG51bGwpIHJldHVybiBFTk9TWVM7ICAgLy8gVE9ETzogUG9zc2libGUgdG8gYmUgbnVsbCBpbiBXb3JrbGV0cz9cclxuICAgICAgICAgICAgbm93TXMgPSBwLm5vdygpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlICtDbG9ja0lkLlBST0NFU1NfQ1BVVElNRV9JRDpcclxuICAgICAgICBjYXNlICtDbG9ja0lkLlRIUkVBRF9DUFVUSU1FX0lEOlxyXG4gICAgICAgICAgICByZXR1cm4gRU5PU1lTO1xyXG4gICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgIHJldHVybiBFSU5WQUw7XHJcbiAgICB9XHJcbiAgICBjb25zdCBub3dOcyA9IEJpZ0ludChNYXRoLnJvdW5kKG5vd01zICogMTAwMCAqIDEwMDApKTtcclxuICAgIHdyaXRlVWludDY0KHRoaXMsIG91dFB0ciwgbm93TnMpO1xyXG5cclxuICAgIHJldHVybiBFU1VDQ0VTUztcclxufSJdfQ==