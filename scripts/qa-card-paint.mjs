#!/usr/bin/env node
/**
 * First two member cards must actually PAINT on a phone.
 * A black 3:4 hole with bunny ears at the top is a fail.
 * Looks at the live page the way the user does — 390×844, scroll to the wall.
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
// PIL via a tiny inline python after screenshots

const url = process.argv[2] || "http://127.0.0.1:8080/";
const outDir = "/workspace/screenshots/card-paint";
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});

const failed = [];
try {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForTimeout(800);
  await page.locator("[data-house-wall]").scrollIntoViewIfNeeded();
  await page.waitForTimeout(700);

  const cards = page.locator("[data-member-card]");
  const n = await cards.count();
  if (n < 2) failed.push(`only ${n} member cards`);

  const slugs = ["reggina", "gege"];
  for (let i = 0; i < 2; i++) {
    const card = cards.nth(i);
    await card.scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    const art = card.locator("figure.member-art");
    const shot = `${outDir}/${i + 1}-${slugs[i]}.png`;
    await art.screenshot({ path: shot });

    const info = await art.evaluate((el) => {
      const img = el.querySelector("img");
      const cs = getComputedStyle(img);
      const r = el.getBoundingClientRect();
      return {
        complete: img?.complete ?? false,
        nw: img?.naturalWidth ?? 0,
        nh: img?.naturalHeight ?? 0,
        src: img?.currentSrc || img?.getAttribute("src") || "",
        w: r.width,
        h: r.height,
        position: cs.position,
        inset: cs.inset || `${cs.top} ${cs.right} ${cs.bottom} ${cs.left}`,
        fit: cs.objectFit,
        opacity: cs.opacity,
      };
    });
    writeFileSync(
      `${outDir}/${i + 1}-${slugs[i]}.json`,
      JSON.stringify(info, null, 2),
    );
    if (!info.complete || info.nw < 200 || info.nh < 200) {
      failed.push(`${slugs[i]} image not decoded (${info.nw}x${info.nh})`);
    }
    if (info.position !== "absolute") {
      failed.push(`${slugs[i]} img is not absolutely pinned (${info.position})`);
    }
    if (info.h < 180) {
      failed.push(`${slugs[i]} art box too short ${info.h}px`);
    }
  }

  // Pixel critic: the art screenshot must not be mostly near-black.
  const { execFileSync } = await import("node:child_process");
  const raw = execFileSync(
    "python3",
    [
      "-c",
      `
from pathlib import Path
from PIL import Image
import json, sys
out = []
fail = []
for p in sorted(Path("${outDir}").glob("*.png")):
    im = Image.open(p).convert("RGB")
    a = list(im.getdata())
    n = len(a)
    dark = sum(1 for r,g,b in a if r < 28 and g < 28 and b < 28) / n
    # top 12% should not be the only painted band
    w,h = im.size
    top = im.crop((0,0,w,max(1,int(h*0.12))))
    rest = im.crop((0,int(h*0.18),w,h))
    td = sum(1 for r,g,b in top.getdata() if r+g+b > 80) / max(1,len(list(top.getdata())))
    rd = sum(1 for r,g,b in rest.getdata() if r+g+b > 80) / max(1,len(list(rest.getdata())))
    rec = {"file": p.name, "dark": round(dark,3), "top_lit": round(td,3), "body_lit": round(rd,3), "size":[w,h]}
    out.append(rec)
    if dark > 0.42:
        fail.append(f"{p.name} mostly black dark={dark:.2f}")
    if rd < 0.28:
        fail.append(f"{p.name} body not painted body_lit={rd:.2f}")
print(json.dumps({"shots": out, "fail": fail}))
`,
    ],
    { encoding: "utf8" },
  );
  const pix = JSON.parse(raw);
  writeFileSync(`${outDir}/pixels.json`, JSON.stringify(pix, null, 2));
  failed.push(...(pix.fail || []));
} catch (err) {
  failed.push(String(err?.message || err));
} finally {
  await browser.close();
}

const report = { pass: failed.length === 0, fail: failed };
console.log(JSON.stringify(report));
process.exit(failed.length ? 1 : 0);
