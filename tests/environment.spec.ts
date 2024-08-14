import { expect } from "@playwright/test";
import { test } from "./fixture.js";


test('Works on the UI thread', async ({ page, wasm: { main } }) => {
  await expect(main).toHaveText("DEADBEEF");
});

test('Works on a Worker thread', async ({ page, wasm: { worker } }) => {
  await expect(worker).toHaveText("DEADBEEF");
});

test('Works in an Audio Worklet', async ({ page, wasm: { worklet, ready, readyWorklet } }) => {
  // We need to make sure the AudioContext is able to be created.
  // Keep clicking and waiting until one of those clicks registers.
  // I don't know why this is so flaky...
  for (let i = 0; i < 10; ++i) {
    await new Promise(resolve => setTimeout(resolve, 250));
    await ready.click({ force: true });

    if (await readyWorklet.textContent() == "✔️")
      break;
  }

  await expect(readyWorklet).toHaveText("✔️");
  await expect(ready).toHaveText("✔️");

  await expect(worklet).toHaveText("DEADBEEF");
});
