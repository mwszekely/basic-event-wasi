import { test as base, expect, Locator, PlaywrightTestArgs, PlaywrightTestOptions, PlaywrightWorkerArgs, PlaywrightWorkerOptions, TestType } from '@playwright/test';

interface WasmFixture {
  wasm: {
    main: Locator;
    worker: Locator;
    worklet: Locator;
    readyMain: Locator;
    readyWorker: Locator;
    readyWorklet: Locator;
    ready: Locator;
    output: Locator;
  }
}

export const test: TestType<PlaywrightTestArgs & PlaywrightTestOptions & WasmFixture, PlaywrightWorkerArgs & PlaywrightWorkerOptions> = base.extend<WasmFixture>({
  wasm: async ({ page }, use) => {
    await page.goto('/www');

    const main = page.locator("#main");
    const worker = page.locator("#worker");
    const worklet = page.locator("#worklet");
    const readyMain = page.locator("#ready-main");
    const readyWorker = page.locator("#ready-worker");
    const readyWorklet = page.locator("#ready-worklet");
    const ready = page.locator("#ready");
    const output = page.locator("#output");

    // These are ordered like this and have huge timeouts
    // to try to ensure that tests don't fail from how long it can
    // take to fetching the worker or worklet, because that's kinda lame.
    await expect(readyMain).toHaveText("✔️");
    await expect(readyWorker).toHaveText("✔️");
    //await new Promise(resolve => setTimeout(resolve, 250));             // Multiple are here to deal with high CPU-use-related-jankiness. It's great, we love it.
    //await new Promise(resolve => setTimeout(resolve, 250));
    //await new Promise(resolve => setTimeout(resolve, 250));

    await use({
      main,
      worker,
      worklet,
      readyMain,
      readyWorker,
      readyWorklet,
      ready,
      output,
    });
  },
});