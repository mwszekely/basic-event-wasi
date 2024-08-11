import { expect } from "@playwright/test";
import { test } from "./fixture.js";


test.describe('Identity', () => {
  test('Identity i8 works', async ({ page, wasm: { output } }) => {
    for (let i = -128; i < 128; ++i) {
      await page.evaluate((i) => (window as any).output.innerHTML = (globalThis as any)._wasm.embind.identity_i8(i).toString(), i);
      await expect(output).toHaveText(i.toString());
    }
  });

  test('Identity u8 works', async ({ page, wasm: { output } }) => {
    for (let i = 0; i < 255; ++i) {
      await page.evaluate((i) => (window as any).output.innerHTML = (globalThis as any)._wasm.embind.identity_u8(i).toString(), i);
      await expect(output).toHaveText(i.toString());
    }
  });

  test('Identity i16 works', async ({ page, wasm: { output } }) => {
    const ToTest = generateTestableInts(2, true);
    for (const t of ToTest) {
      await page.evaluate((i) => (window as any).output.innerHTML = (globalThis as any)._wasm.embind.identity_i16(i).toString(), t);
      await expect(output).toHaveText(t.toString());
    }
  });

  test('Identity u16 works', async ({ page, wasm: { output } }) => {
    const ToTest = generateTestableInts(2, false);
    for (const t of ToTest) {
      await page.evaluate((i) => (window as any).output.innerHTML = (globalThis as any)._wasm.embind.identity_u16(i).toString(), t);
      await expect(output).toHaveText(t.toString());
    }
  });

  test('Identity i32 works', async ({ page, wasm: { output } }) => {
    const ToTest = generateTestableInts(4, true);
    for (const t of ToTest) {
      await page.evaluate((i) => (window as any).output.innerHTML = (globalThis as any)._wasm.embind.identity_i32(i).toString(), t);
      await expect(output).toHaveText(t.toString());
    }
  });

  test('Identity u32 works', async ({ page, wasm: { output } }) => {
    const ToTest = generateTestableInts(4, false);
    for (const t of ToTest) {
      await page.evaluate((i) => (window as any).output.innerHTML = (globalThis as any)._wasm.embind.identity_u32(i).toString(), t);
      await expect(output).toHaveText(t.toString());
    }
  });

  test('Identity i64 works', async ({ page, wasm: { output } }) => {
    const ToTest = generateTestableInts(8, true);
    for (const t of ToTest) {
      await page.evaluate((i) => (window as any).output.innerHTML = (globalThis as any)._wasm.embind.identity_i64(i).toString(), t);
      await expect(output).toHaveText(t.toString());
    }
  });

  test('Identity u64 works', async ({ page, wasm: { output } }) => {
    const ToTest = generateTestableInts(8, false);
    for (const t of ToTest) {
      await page.evaluate((i) => (window as any).output.innerHTML = (globalThis as any)._wasm.embind.identity_u64(i).toString(), t);
      await expect(output).toHaveText(t.toString());
    }
  });

  test('Identity string works', async ({ page, wasm: { output } }) => {
    const t = "Test string ✔️";
    await page.evaluate((i) => (window as any).output.innerHTML = (globalThis as any)._wasm.embind.identity_string(i).toString(), t);
    await expect(output).toHaveText(t.toString());
  });

  test('Identity wstring works', async ({ page, wasm: { output } }) => {
    const t = "Test string ✔️";
    await page.evaluate((i) => (window as any).output.innerHTML = (globalThis as any)._wasm.embind.identity_wstring(i).toString(), t);
    await expect(output).toHaveText(t.toString());
  });




  function generateTestableInts<T extends number | bigint>(width: number, signed: boolean): T[] {
    if (width == 1)
      return Array.from((function* () { for (let i = 0; i < 255; ++i) yield i - (signed ? 0x80 : 0); }())) as T[];
    // Unsigned: [uintmin, uintmin+1, intmax-1, intmax, intmax+1, uintmax-1, uintmax]
    // Signed:   [ intmin,  intmin+1, -1,       0,      1,         intmax-1,  intmax]
    const ret1: number[] = [0x0000_0000_0000_0000, 0x0000_0000_0000_0001, 0x0000_0000_0000_007F, 0x0000_0000_0000_0080, 0x0000_0000_0000_0081, 0x0000_0000_0000_00FE, 0x0000_0000_0000_00FF];
    const ret2: number[] = [0x0000_0000_0000_0000, 0x0000_0000_0000_0001, 0x0000_0000_0000_7FFF, 0x0000_0000_0000_8000, 0x0000_0000_0000_8001, 0x0000_0000_0000_FFFE, 0x0000_0000_0000_FFFF];
    const ret4: number[] = [0x0000_0000_0000_0000, 0x0000_0000_0000_0001, 0x0000_0000_7FFF_FFFF, 0x0000_0000_8000_0000, 0x0000_0000_8000_0001, 0x0000_0000_FFFF_FFFE, 0x0000_0000_FFFF_FFFF];
    const ret8: bigint[] = [0x0000_0000_0000_0000n, 0x0000_0000_0000_0001n, 0x7FFF_FFFF_FFFF_FFFFn, 0x8000_0000_0000_0000n, 0x8000_0000_0000_0001n, 0xFFFF_FFFF_FFFF_FFFEn, 0xFFFF_FFFF_FFFF_FFFFn];
    function ensign(arr: (number | bigint)[]) {
      arr = arr.slice();
      if (!signed)
        return arr;
      for (let i = 0; i < arr.length; ++i)
        if (width == 8)
          (arr as bigint[])[i] -= (0x80n << BigInt((width - 1) * 8));
        else
          (arr as number[])[i] -= ((0x80 << ((width - 1) * 8)) >>> 0);
      return arr;
    }
    switch (width) {
      case 2: return ensign(ret2) as T[];
      case 4: return ensign(ret4) as T[];
      case 8: return ensign(ret8) as T[];
    }
    return null!;
  }

});