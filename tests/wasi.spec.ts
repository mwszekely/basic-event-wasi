import { expect } from "@playwright/test";
import { test } from "./fixture.js";



test('stdout (printf, etc)', async ({ page, wasm }) => {
  const msgPromise = page.waitForEvent('console');
  await page.evaluate(() => (globalThis as any)._wasm.exports.printTest());

  const msg = await (await msgPromise).args()[0].jsonValue();

  // Note: Natural C/C++ IO usually results in a stray newline at the end.
  // printTest is specifically written to flush stdout without using a newline.
  expect(msg).toBe("Main: Hello, world!");
});

// Ensure that the time returned by C++'s std::chrono clocks are the same as the JS clocks.
test('clock_time_get<system>', async ({ page, wasm }) => {
  for (let i = 0; i < 10; ++i) {
    const [nowJs, nowC] = JSON.parse(await page.evaluate(() => {
      return JSON.stringify([Number(Date.now()), Number((globalThis as any)._wasm.embind.nowSystem())]);
    }));

    const msDiff = Math.abs(nowJs - nowC);
    expect(msDiff).toBeLessThan(10);
    await new Promise(resolve => setTimeout(resolve, 250));
  }
});

// Same as the other one, just check the clocks over a few seconds
test('clock_time_get<steady>', async ({ page, wasm }) => {
  for (let i = 0; i < 10; ++i) {
    const [nowJs, nowC] = JSON.parse(await page.evaluate(() => {
      return JSON.stringify([Number(performance.now()), Number((globalThis as any)._wasm.embind.nowSteady())]);
    }));

    const msDiff = Math.abs(nowJs - nowC);
    expect(msDiff).toBeLessThan(10);
    await new Promise(resolve => setTimeout(resolve, 250));
  }
});

