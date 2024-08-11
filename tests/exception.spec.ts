import { expect } from "@playwright/test";
import { test } from "./fixture.js";


test('Unhandled C++ exceptions terminate', async ({ page, wasm: { main } }) => {
  await expect(page.evaluate(() => {
    (globalThis as any)._wasm.embind.throwsException();
  })).rejects.toThrow();
});

test('C++ can handle its own exceptions', async ({ page, wasm: { main } }) => {
  await page.evaluate(() => {
    (globalThis as any)._wasm.embind.catchesException();
  });
});

test('Unhandled C++ exceptions can be handled by JS', async ({ page, wasm: { worker } }) => {
  expect(await page.evaluate(() => {
    try {
      (globalThis as any)._wasm.embind.throwsException();
      return false;
    }
    catch (ex) {
      return true;
    }
  })).toBe(true);
});


