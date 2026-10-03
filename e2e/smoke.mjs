#!/usr/bin/env node
/**
 * End-to-end smoke test against a running server (default http://127.0.0.1:8080).
 *
 * Proves the critical user journey works in a real browser:
 *   1. page loads with zero uncaught errors
 *   2. the scroll-scrub film decodes every clip and paints to canvas
 *   3. scrolling forward advances the HUD act marker
 *   4. the join dialog is an accessible modal (focus moves in, Escape closes)
 *   5. a join request round-trips through the server function into Postgres
 *
 * Exit code 0 = pass, 1 = fail. Used by CI after `vite build && vite preview`.
 */
import assert from "node:assert/strict";
import { chromium } from "playwright";

const url = process.argv[2] ?? "http://127.0.0.1:8080/";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));

const step = async (name, fn) => {
  const t = performance.now();
  await fn();
  console.log(`  ✓ ${name} (${Math.round(performance.now() - t)}ms)`);
};

try {
  console.log(`E2E smoke → ${url}`);

  await step("page loads", async () => {
    const res = await page.goto(url, { waitUntil: "domcontentloaded" });
    assert.equal(res?.status(), 200);
  });

  await step("film decodes all clips and paints to canvas", async () => {
    await page.waitForSelector("canvas[data-film-ready='1']", { timeout: 60_000 });
    const painted = await page.evaluate(() => {
      const c = document.querySelector("canvas[data-film-ready='1']");
      const ctx = c.getContext("2d");
      const { data } = ctx.getImageData(c.width / 2 - 20, c.height / 2 - 20, 40, 40);
      let lum = 0;
      for (let i = 0; i < data.length; i += 4) lum += data[i] + data[i + 1] + data[i + 2];
      return lum / (data.length / 4) / 3;
    });
    assert.ok(painted > 8, `canvas looks blank (mean luminance ${painted.toFixed(1)})`);
  });

  await step("scrolling advances the film", async () => {
    const act = () => page.locator("text=/^[1-5] · /").first().innerText();
    const before = await act();
    await page.evaluate(() => window.scrollTo(0, innerHeight * 15.6 * 0.6));
    await page.waitForTimeout(800);
    const after = await act();
    assert.notEqual(after, before, `HUD act did not change (${before})`);
  });

  await step("join dialog is an accessible modal", async () => {
    await page.getByRole("button", { name: /加入/ }).first().click();
    const dialog = page.locator('[role="dialog"][aria-modal="true"]');
    await dialog.waitFor();
    await page.waitForTimeout(150);
    const focused = await page.evaluate(() => document.activeElement?.getAttribute("placeholder"));
    assert.equal(focused, "IGN", "focus should move into the form");
    await page.keyboard.press("Escape");
    await page.locator('[aria-hidden="true"] [role="dialog"]').waitFor({ state: "attached" });
  });

  await step("join request round-trips to the database", async () => {
    await page.getByRole("button", { name: /加入/ }).first().click();
    await page.locator('input[placeholder="IGN"]').fill(`e2e-${Date.now() % 1e6}`);
    await page.locator('[role="dialog"] button[type="submit"]').click();
    await page.getByText("See you in-game").waitFor({ timeout: 15_000 });
  });

  assert.deepEqual(errors, [], `uncaught page errors:\n${errors.join("\n")}`);
  console.log("PASS");
} catch (err) {
  console.error("FAIL:", err.message);
  await page.screenshot({ path: "e2e-failure.png" }).catch(() => {});
  process.exitCode = 1;
} finally {
  await browser.close();
}
