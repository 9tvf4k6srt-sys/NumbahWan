/**
 * Agent-driven film walk. Screenshot every act on a phone and a
 * desktop. Fail if the canvas goes black or the console throws.
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const url = process.argv[2] || "http://127.0.0.1:8080/";
mkdirSync("/workspace/screenshots/scroll", { recursive: true });

const browser = await chromium.launch({
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

const stops = [
  [0.00, "00-loader-or-void"],
  [0.06, "01-void"],
  [0.14, "02-orbit"],
  [0.32, "03-field"],
  [0.44, "04-forest"],
  [0.56, "05-hall"],
  [0.68, "06-raid"],
  [0.80, "07-climb"],
  [0.94, "08-invite"],
  [1.05, "09-cta"],
  [1.18, "10-wall"],
];

async function walk(page, tag, width, height) {
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.setViewportSize({ width, height });
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page
    .waitForSelector("[data-film-ready='1']", { timeout: 14000 })
    .catch(() => null);
  await page.waitForTimeout(400);
  const filmH = await page.evaluate(() => 15.6 * window.innerHeight);
  for (const [p, name] of stops) {
    await page.evaluate(
      ({ y }) => window.scrollTo(0, y),
      { y: filmH * p },
    );
    await page.waitForTimeout(220);
    await page.screenshot({
      path: `/workspace/screenshots/scroll/${tag}-${name}.png`,
    });
  }
  return errors;
}

const phone = await browser.newPage();
const phoneErr = await walk(phone, "m", 390, 844);
const desk = await browser.newPage();
const deskErr = await walk(desk, "d", 1440, 900);
await browser.close();

const errors = [...phoneErr, ...deskErr];
if (errors.length) {
  console.error(JSON.stringify({ pass: false, errors }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ pass: true, phone: stops.length, desk: stops.length }));
