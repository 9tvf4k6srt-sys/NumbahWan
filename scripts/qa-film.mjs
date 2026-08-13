import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const url = process.argv[2] || "http://127.0.0.1:8080/";
mkdirSync("/workspace/screenshots", { recursive: true });

const browser = await chromium.launch({
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

async function shoot(name, viewport, at) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(2000);
  if (at === "join") {
    await page.getByRole("button", { name: "Join" }).first().click();
    await page.waitForTimeout(400);
  } else if (typeof at === "number" && at > 0) {
    const y = await page.evaluate((ratio) => {
      const vh = window.innerHeight;
      const film = 12.4 * vh;
      return ratio <= 1 ? film * ratio : document.documentElement.scrollHeight;
    }, at);
    await page.evaluate((y) => window.scrollTo(0, y), y);
    await page.waitForTimeout(700);
  }
  await page.screenshot({
    path: `/workspace/screenshots/${name}.png`,
    fullPage: false,
  });
  const overflowX = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  console.log(JSON.stringify({ name, errors, overflowX }));
  await page.close();
  return errors;
}

const d = { width: 1440, height: 900 };
const m = { width: 390, height: 844 };

await shoot("qa-desktop-hero", d, 0);
await shoot("qa-desktop-act1", d, 0.07);
await shoot("qa-desktop-act2", d, 0.22);
await shoot("qa-desktop-stats", d, 0.36);
await shoot("qa-desktop-act3", d, 0.51);
await shoot("qa-desktop-act4", d, 0.76);
await shoot("qa-desktop-act5", d, 0.9);
await shoot("qa-desktop-hall", d, 2);
await shoot("qa-desktop-join", d, "join");
await shoot("qa-mobile-hero", m, 0);
await shoot("qa-mobile-act1", m, 0.07);
await shoot("qa-mobile-act2", m, 0.22);
await shoot("qa-mobile-hall", m, 2);

await browser.close();
