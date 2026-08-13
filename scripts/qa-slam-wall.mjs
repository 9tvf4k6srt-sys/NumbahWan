import { chromium } from "playwright";
import { mkdirSync } from "fs";

mkdirSync("/workspace/screenshots/slam-wall", { recursive: true });
const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const errors = [];
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
});
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
await page.goto("http://127.0.0.1:8080/", { waitUntil: "networkidle", timeout: 60000 });
await page.waitForSelector('[data-film-canvas="1"]', { timeout: 20000 });
await page.waitForFunction(
  () => document.querySelector("[data-film-canvas]")?.dataset.filmReady === "1",
  { timeout: 20000 },
).catch(() => {});
await page.waitForTimeout(800);

const shot = async (name) => {
  await page.screenshot({
    path: `/workspace/screenshots/slam-wall/${name}.png`,
    fullPage: false,
  });
};

const read = async () =>
  page.evaluate(() => {
    const c = document.querySelector("[data-film-canvas]");
    return {
      clip: c?.dataset.activeClip,
      time: c?.dataset.activeTime,
      nScale: c?.dataset.voidNScale,
      y: window.scrollY,
    };
  });

await shot("00-void-start");
const s0 = await read();
console.log("start", JSON.stringify(s0));

// mid void
await page.evaluate(() => window.scrollTo(0, window.innerHeight * 1.5));
await page.waitForTimeout(500);
await shot("01-void-mid");
const s1 = await read();
console.log("mid", JSON.stringify(s1));

// end void / into orbit
await page.evaluate(() => window.scrollTo(0, window.innerHeight * 2.8));
await page.waitForTimeout(500);
await shot("02-void-end");
const s2 = await read();
console.log("end", JSON.stringify(s2));

// jump toward wall: film is 15.6vh, hall after
await page.evaluate(() => window.scrollTo(0, window.innerHeight * 17.2));
await page.waitForTimeout(700);
await shot("03-wall");
const wall = await page.evaluate(() => {
  const tiles = [...document.querySelectorAll("[data-roster-tile]")];
  return {
    n: tiles.length,
    names: tiles.map((t) => t.querySelector("figcaption")?.textContent),
    imgs: tiles.slice(0, 3).map((t) => t.querySelector("img")?.naturalWidth),
  };
});
console.log("wall", JSON.stringify(wall));

// specifically the three circled
await page.evaluate(() => {
  const el = document.querySelector('[data-roster-tile="maniojoja"]');
  el?.scrollIntoView({ block: "center" });
});
await page.waitForTimeout(300);
await shot("04-maniojoja");
await page.evaluate(() => {
  document.querySelector('[data-roster-tile="leiyumo"]')?.scrollIntoView({ block: "center" });
});
await page.waitForTimeout(300);
await shot("05-leiyumo");
await page.evaluate(() => {
  document.querySelector('[data-roster-tile="guning"]')?.scrollIntoView({ block: "center" });
});
await page.waitForTimeout(300);
await shot("06-guning");

const scale0 = Number(s0.nScale || 0);
const scale1 = Number(s1.nScale || 0);
const scale2 = Number(s2.nScale || s1.nScale || 0);
const slamOk = scale1 > scale0 + 0.15 || scale2 > scale0 + 0.4;
console.log(
  JSON.stringify({
    slamOk,
    scale0,
    scale1,
    scale2,
    errors,
    tiles: wall.n,
  }),
);
if (!slamOk) {
  console.error("FAIL slam: N scale did not grow");
  process.exitCode = 1;
}
if (errors.length) {
  console.error("FAIL console", errors);
  process.exitCode = 1;
}
await browser.close();
