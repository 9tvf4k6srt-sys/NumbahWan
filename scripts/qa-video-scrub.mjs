import { chromium } from "playwright";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const url = "http://127.0.0.1:8080/";
const browser = await chromium.launch({
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
});
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});

await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForTimeout(2500);

async function at(name, ratio) {
  await page.evaluate((r) => {
    const vh = window.innerHeight;
    const film = 15.6 * vh;
    window.scrollTo(0, film * r);
  }, ratio);
  await page.waitForTimeout(550);
  const path = `/workspace/screenshots/${name}.png`;
  await page.screenshot({ path, fullPage: false });
  const buf = readFileSync(path);
  const hash = createHash("md5").update(buf).digest("hex").slice(0, 10);
  const info = await page.evaluate(() => {
    const vids = [...document.querySelectorAll("video")];
    return vids.map((v) => ({
      src: (v.currentSrc || v.src || "").split("/").pop(),
      t: Number(v.currentTime.toFixed(3)),
      rs: v.readyState,
      op: getComputedStyle(v).opacity,
    }));
  });
  console.log(JSON.stringify({ name, ratio, hash, info, errors: [...errors] }));
  errors.length = 0;
}

await at("vscr-hero", 0.01);
await at("vscr-void-a", 0.04);
await at("vscr-void-b", 0.09);
await at("vscr-orbit-a", 0.16);
await at("vscr-orbit-b", 0.22);
await at("vscr-field", 0.32);
await at("vscr-forest", 0.44);
await at("vscr-raid", 0.68);
await at("vscr-climb", 0.8);
await at("vscr-invite", 0.92);

const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
await mobile.goto(url, { waitUntil: "domcontentloaded" });
await mobile.waitForTimeout(2200);
await mobile.evaluate(() => window.scrollTo(0, window.innerHeight * 15.6 * 0.18));
await mobile.waitForTimeout(600);
await mobile.screenshot({
  path: "/workspace/screenshots/vscr-mobile-orbit.png",
  fullPage: false,
});
const overflow = await mobile.evaluate(
  () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
);
const vids = await mobile.evaluate(() =>
  [...document.querySelectorAll("video")].map((v) => ({
    src: (v.currentSrc || "").split("/").pop(),
    t: Number(v.currentTime.toFixed(3)),
    rs: v.readyState,
  })),
);
console.log(JSON.stringify({ mobileOverflow: overflow, vids }));
await browser.close();
