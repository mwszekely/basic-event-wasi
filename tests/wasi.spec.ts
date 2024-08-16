import { expect } from "@playwright/test";
import { test } from "./fixture.js";
import { VeryLongString } from "./stage/constants.js";

// Ensure writing to the console works
test('stdout (printf, etc)', async ({ page, wasm }) => {
  const msgPromise = page.waitForEvent('console');
  await page.evaluate(() => _wasm.exports.printTest());

  const msg = await (await msgPromise).args()[0].jsonValue();

  // Note: Natural C/C++ IO usually results in a stray newline at the end.
  // printTest is specifically written to flush stdout without using a newline.
  expect(msg).toBe("Main: Hello, world!");
});

// Ensure we can read from `stdin` properly
test('stdin works', async ({ page, wasm }) => {
  const v = [VeryLongString, VeryLongString, VeryLongString].join("");
  await page.evaluate((vls) => {
    _wasm.addEventListener("fd_read", e => {
      e.preventDefault();
      e.detail.data.push(vls, vls, vls, "\n");
    });
  }, VeryLongString);

  expect(await page.evaluate(() => { return _wasm.embind.return_stdin(); })).toBe(v);
  expect(await page.evaluate(() => { return _wasm.embind.return_stdin(); })).toBe(v);
  expect(await page.evaluate(() => { return _wasm.embind.return_stdin(); })).toBe(v);
})

// Ensure the environment variables event functions properly.
test('Environment variables', async ({ page, wasm }) => {
  expect(await page.evaluate(() => { return _wasm.embind.getenv("key_1"); })).toBe("value_1");
  expect(await page.evaluate(() => { return _wasm.embind.getenv("key_2"); })).toBe("value_2");
  expect(await page.evaluate(() => { return _wasm.embind.getenv("key_3"); })).toBe("value_3");
})

// Ensure that the time returned by C++'s std::chrono clocks are the same as the JS clocks.
test('clock_time_get<system>', async ({ page, wasm }) => {
  for (let i = 0; i < 10; ++i) {
    const [nowJs, nowC] = JSON.parse(await page.evaluate(() => {
      return JSON.stringify([Number(Date.now()), Number(_wasm.embind.nowSystem())]);
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
      return JSON.stringify([Number(performance.now()), Number(_wasm.embind.nowSteady())]);
    }));

    const msDiff = Math.abs(nowJs - nowC);
    expect(msDiff).toBeLessThan(10);
    await new Promise(resolve => setTimeout(resolve, 250));
  }
});

