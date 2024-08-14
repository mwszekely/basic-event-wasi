import { writeUint32 } from "../util/write-uint32.js";
export function environ_get(environCountOutput, environSizeOutput) {
    writeUint32(this, environCountOutput, 0);
    writeUint32(this, environSizeOutput, 0);
    return 0;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW52aXJvbl9nZXQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvd2FzaV9zbmFwc2hvdF9wcmV2aWV3MS9lbnZpcm9uX2dldC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFDQSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFHdEQsTUFBTSxVQUFVLFdBQVcsQ0FBeUIsa0JBQTRDLEVBQUUsaUJBQWtDO0lBQ2hJLFdBQVcsQ0FBQyxJQUFJLEVBQUUsa0JBQWtCLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDekMsV0FBVyxDQUFDLElBQUksRUFBRSxpQkFBaUIsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUV4QyxPQUFPLENBQUMsQ0FBQztBQUNiLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgdHlwZSB7IFBvaW50ZXIgfSBmcm9tIFwiLi4vdHlwZXMuanNcIjtcclxuaW1wb3J0IHsgd3JpdGVVaW50MzIgfSBmcm9tIFwiLi4vdXRpbC93cml0ZS11aW50MzIuanNcIjtcclxuaW1wb3J0IHR5cGUgeyBJbnN0YW50aWF0ZWRXYXNtIH0gZnJvbSBcIi4uL3dhc20uanNcIjtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBlbnZpcm9uX2dldCh0aGlzOiBJbnN0YW50aWF0ZWRXYXNtLCBlbnZpcm9uQ291bnRPdXRwdXQ6IFBvaW50ZXI8UG9pbnRlcjxudW1iZXI+PiwgZW52aXJvblNpemVPdXRwdXQ6IFBvaW50ZXI8bnVtYmVyPikge1xyXG4gICAgd3JpdGVVaW50MzIodGhpcywgZW52aXJvbkNvdW50T3V0cHV0LCAwKTtcclxuICAgIHdyaXRlVWludDMyKHRoaXMsIGVudmlyb25TaXplT3V0cHV0LCAwKTtcclxuXHJcbiAgICByZXR1cm4gMDtcclxufVxyXG4iXX0=