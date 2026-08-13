#!/usr/bin/env node
/**
 * Daily explorer — read learnings, probe the live page, log what drifted.
 * Does NOT edit product code. Promotions still go through learn-and-test.mjs.
 *
 * Run via cron (scripts/cron-daily-improve.sh) or startup.sh if last run > 24h.
 */
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  statSync,
} from "node:fs";
import { chromium } from "playwright";

const ROOT = "/workspace";
const DAILY = `${ROOT}/.grok/learnings/daily`;
const LOG = `${ROOT}/.grok/learnings/LOG.json`;
const STAMP = `${DAILY}/stamp`;
const URL = process.env.APP_URL || "http://127.0.0.1:8080/";
const FORCE = process.argv.includes("--force");

mkdirSync(DAILY, { recursive: true });

if (!FORCE && existsSync(STAMP)) {
  const age = Date.now() - statSync(STAMP).mtimeMs;
  if (age < 20 * 60 * 60 * 1000) {
    console.log("daily-improve: ran recently, skip");
    process.exit(0);
  }
}

const day = new Date().toISOString().slice(0, 10);
const notes = [];

function note(id, ok, detail) {
  notes.push({ id, ok, detail });
}

let critic = null;
try {
  const raw = execFileSync("node", [`${ROOT}/scripts/learn-and-test.mjs`, URL], {
    encoding: "utf8",
    timeout: 180000,
  });
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  critic = JSON.parse(raw.slice(start, end + 1));
  note("critic", !!critic.pass, critic.pass ? "all axes >= 8" : critic.worst);
} catch (err) {
  note("critic", false, String(err?.message || err).slice(0, 400));
}

try {
  const browser = await chromium.launch({
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await mobile.goto(URL, { waitUntil: "domcontentloaded", timeout: 45000 });
  await mobile.waitForTimeout(240);
  const first = await mobile.evaluate(() => {
    const n = document.querySelector("[data-emblem='pixel-n']");
    const r = n instanceof HTMLElement ? n.getBoundingClientRect() : null;
    return {
      n: r
        ? {
            l: r.left,
            t: r.top,
            r: r.right,
            b: r.bottom,
            w: r.width,
            h: r.height,
          }
        : null,
      vw: innerWidth,
      vh: innerHeight,
    };
  });
  if (first.n) {
    const pad = 8;
    const inView =
      first.n.l >= pad &&
      first.n.t >= pad &&
      first.n.r <= first.vw - pad &&
      first.n.b <= first.vh - pad;
    const small = first.n.w <= first.vw * 0.38;
    note("ios-n-in-view", inView && small, first.n);
  } else {
    note("ios-n-in-view", true, "loader already dismissed");
  }

  await mobile
    .waitForSelector("[data-film-ready='1']", { timeout: 12000 })
    .catch(() => null);
  await mobile.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await mobile.waitForTimeout(400);
  const bottom = await mobile.evaluate(() => {
    const wall = document.querySelector("[data-house-wall]");
    const cta = [...document.querySelectorAll("p")].find((p) =>
      (p.textContent || "").includes("想來就來"),
    );
    const tiles = document.querySelectorAll("[data-roster-tile]").length;
    const empty = document.querySelectorAll("[data-empty-seat]").length;
    const leftoverCopy = /還有\s*6|這六格|6 seats left/i.test(document.body.innerText);
    const last = document.querySelector("[data-house-wall], #join");
    const leftover = last
      ? document.documentElement.scrollHeight - last.getBoundingClientRect().bottom - window.scrollY
      : 0;
    return {
      wall: !!wall,
      tiles,
      empty,
      leftoverCopy,
      leftover,
      ctaText: cta ? cta.textContent : "",
    };
  });
  note(
    "empty-after-cta",
    bottom.wall && bottom.tiles >= 24 && bottom.empty === 0 && !bottom.leftoverCopy && bottom.leftover < 280,
    bottom,
  );

  const squares = await mobile.evaluate(() => {
    return [...document.querySelectorAll("[data-roster-tile]")].map((el) => {
      const r = el.getBoundingClientRect();
      const img = el.querySelector("img");
      const cs = img ? getComputedStyle(img) : null;
      return {
        ratio: r.height ? r.width / r.height : 0,
        radius: cs?.borderRadius || "",
        fit: cs?.objectFit || "",
      };
    });
  });
  const allSquare = squares.length >= 24 && squares.every((s) => s.ratio >= 0.92 && s.ratio <= 1.08);
  const noCircle = squares.every((s) => !s.radius.includes("50%"));
  note("square-full-bleed", allSquare && noCircle, {
    count: squares.length,
    sample: squares[0],
  });

  await mobile.screenshot({
    path: `${ROOT}/screenshots/daily-mobile-${day}.png`,
    fullPage: false,
  });
  await browser.close();
} catch (err) {
  note("probe", false, String(err?.message || err).slice(0, 400));
}

const report = {
  at: new Date().toISOString(),
  day,
  notes,
  critic: critic
    ? { pass: critic.pass, scores: critic.scores, worst: critic.worst }
    : null,
  proposals: notes
    .filter((n) => !n.ok)
    .map((n) => `Re-check ${n.id}: ${JSON.stringify(n.detail).slice(0, 180)}`),
};

writeFileSync(`${DAILY}/${day}.json`, JSON.stringify(report, null, 2));
writeFileSync(STAMP, report.at);
if (existsSync(LOG)) {
  const log = JSON.parse(readFileSync(LOG, "utf8"));
  log.entries.push({
    at: report.at,
    lesson: "daily improve probe",
    kept: notes.every((n) => n.ok),
    note: report.proposals.length
      ? report.proposals.join(" | ")
      : "no drift vs ux-nuances.md",
  });
  writeFileSync(LOG, JSON.stringify(log, null, 2));
}

console.log(JSON.stringify(report, null, 2));
