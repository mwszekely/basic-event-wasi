import { EBADF, ESUCCESS } from "../errno.js";
export class FileDescriptorSeekEvent extends CustomEvent {
    constructor(fileDescriptor) {
        super("fd_seek", { cancelable: true, detail: { fileDescriptor } });
    }
}
/** POSIX lseek */
export function fd_seek(fd, offset, whence, offsetOut) {
    if (this.dispatchEvent(new FileDescriptorSeekEvent(fd))) {
        switch (fd) {
            case 0:
                break;
            case 1:
                break;
            case 2:
                break;
            default:
                return EBADF;
        }
    }
    return ESUCCESS;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmRfc2Vlay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy93YXNpX3NuYXBzaG90X3ByZXZpZXcxL2ZkX3NlZWsudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsTUFBTSxhQUFhLENBQUM7QUFjOUMsTUFBTSxPQUFPLHVCQUF3QixTQUFRLFdBQTBDO0lBQ25GLFlBQVksY0FBc0I7UUFDOUIsS0FBSyxDQUFDLFNBQVMsRUFBRSxFQUFFLFVBQVUsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLEVBQUUsY0FBYyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQ3ZFLENBQUM7Q0FDSjtBQUVELGtCQUFrQjtBQUNsQixNQUFNLFVBQVUsT0FBTyxDQUE2QixFQUFrQixFQUFFLE1BQWMsRUFBRSxNQUFjLEVBQUUsU0FBMEI7SUFDOUgsSUFBSSxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksdUJBQXVCLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDO1FBQ3RELFFBQVEsRUFBRSxFQUFFLENBQUM7WUFDVCxLQUFLLENBQUM7Z0JBQ0YsTUFBTTtZQUNWLEtBQUssQ0FBQztnQkFDRixNQUFNO1lBQ1YsS0FBSyxDQUFDO2dCQUNGLE1BQU07WUFDVjtnQkFDSSxPQUFPLEtBQUssQ0FBQztRQUNyQixDQUFDO0lBQ0wsQ0FBQztJQUNELE9BQU8sUUFBUSxDQUFDO0FBQ3BCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBFQkFERiwgRVNVQ0NFU1MgfSBmcm9tIFwiLi4vZXJybm8uanNcIjtcclxuaW1wb3J0IHR5cGUgeyBJbnN0YW50aWF0ZWRXYXNpIH0gZnJvbSBcIi4uL2luc3RhbnRpYXRlZC13YXNpLmpzXCI7XHJcbmltcG9ydCB0eXBlIHsgRmlsZURlc2NyaXB0b3IsIFBvaW50ZXIgfSBmcm9tIFwiLi4vdHlwZXMuanNcIjtcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgRmlsZURlc2NyaXB0b3JTZWVrRXZlbnREZXRhaWwge1xyXG4gICAgLyoqXHJcbiAgICAgKiBUaGUgW2ZpbGUgZGVzY3JpcHRvcl0oaHR0cHM6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvRmlsZV9kZXNjcmlwdG9yKSwgYSAwLWluZGV4ZWQgbnVtYmVyIGRlc2NyaWJpbmcgd2hlcmUgdGhlIGRhdGEgaXMgZ29pbmcgdG8vY29taW5nIGZyb20uXHJcbiAgICAgKiBcclxuICAgICAqIEl0J3MgbW9yZS1vci1sZXNzIFt1bml2ZXJzYWxseSBleHBlY3RlZF0oaHR0cHM6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvU3RhbmRhcmRfc3RyZWFtKSB0aGF0IDAgaXMgZm9yIGlucHV0LCAxIGZvciBvdXRwdXQsIGFuZCAyIGZvciBlcnJvcnMsXHJcbiAgICAgKiBzbyB5b3UgY2FuIG1hcCAxIHRvIGBjb25zb2xlLmxvZ2AgYW5kIDIgdG8gYGNvbnNvbGUuZXJyb3JgLiBcclxuICAgICAqL1xyXG4gICAgZmlsZURlc2NyaXB0b3I6IG51bWJlcjtcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIEZpbGVEZXNjcmlwdG9yU2Vla0V2ZW50IGV4dGVuZHMgQ3VzdG9tRXZlbnQ8RmlsZURlc2NyaXB0b3JTZWVrRXZlbnREZXRhaWw+IHtcclxuICAgIGNvbnN0cnVjdG9yKGZpbGVEZXNjcmlwdG9yOiBudW1iZXIpIHtcclxuICAgICAgICBzdXBlcihcImZkX3NlZWtcIiwgeyBjYW5jZWxhYmxlOiB0cnVlLCBkZXRhaWw6IHsgZmlsZURlc2NyaXB0b3IgfSB9KTtcclxuICAgIH1cclxufVxyXG5cclxuLyoqIFBPU0lYIGxzZWVrICovXHJcbmV4cG9ydCBmdW5jdGlvbiBmZF9zZWVrKHRoaXM6IEluc3RhbnRpYXRlZFdhc2k8e30+LCBmZDogRmlsZURlc2NyaXB0b3IsIG9mZnNldDogbnVtYmVyLCB3aGVuY2U6IG51bWJlciwgb2Zmc2V0T3V0OiBQb2ludGVyPG51bWJlcj4pOiB0eXBlb2YgRUJBREYgfCB0eXBlb2YgRVNVQ0NFU1Mge1xyXG4gICAgaWYgKHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRmlsZURlc2NyaXB0b3JTZWVrRXZlbnQoZmQpKSkge1xyXG4gICAgICAgIHN3aXRjaCAoZmQpIHtcclxuICAgICAgICAgICAgY2FzZSAwOlxyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgMTpcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIDI6XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgICAgIHJldHVybiBFQkFERjtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICByZXR1cm4gRVNVQ0NFU1M7XHJcbn1cclxuIl19