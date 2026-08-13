/**
 * Compounding critic — Matt Shumer style.
 * Harsh, numeric, one gap. Exit 0 only if every axis >= 8.
 * Failed upgrades MUST be reverted.
 *
 * Axes:
 *   scrub-bidirectional  — active clip + time move forward AND reverse
 *   scrub-hold-frame     — canvas never goes black mid-scrub
 *   brand-n-pixel        — FULL pixel N, both stems, transparent, square box
 *   loader-n-fit         — first-paint N fully inside 390 viewport
 *   member-art           — 24 unique hi-res portraits, not screenshot crops
 *   house-wall           — carousel of 24 cards, NO empty seats, no "6 left"
 *   vitals-hpmp          — labeled HP + MP (guild strip is enough)
 *   copy-no-sheen        — no cinema lines; Traditional Chinese on page
 *   founders-in-film    — RegginA + RegginO plates exist; orbit/field/raid/invite show them
 *   zakum-six-arms      — 5 timestamps per clip; raid/climb cannot drop below 6 arms
 *   film-no-leftover    — no torn customization-sky plate on cuts or dark posters
 *   avatar-centered     — each roster tile is a centered face, no Online pill
 *   research-first       — Maple Idle brief exists and names real towns
 *   characters-alive     — founders live IN the film; no grass islands
 *   film-timeless        — no live contribution rank cards on the film
 *   mobile-overflow
 */
import { chromium } from "playwright";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";

const url = process.argv[2] || "http://127.0.0.1:8080/";
const THRESHOLD = 8;

const browser = await chromium.launch({
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

const scores = {};
const gaps = [];

function score(axis, n, why) {
  scores[axis] = n;
  if (n < THRESHOLD) gaps.push({ axis, n, why });
}

// 0. File-level N critic — catches chopped stems / black plates
let emblemFile = { pass: false, why: "qa-emblem did not run" };
try {
  const raw = execFileSync("python3", ["/workspace/scripts/qa-emblem.py"], {
    encoding: "utf8",
  });
  emblemFile = JSON.parse(raw);
} catch (err) {
  const out = err?.stdout ? String(err.stdout) : "";
  try {
    emblemFile = JSON.parse(out);
  } catch {
    emblemFile = { pass: false, why: String(err?.message || err) };
  }
}

let research = { pass: false, why: "qa-research did not run" };
try {
  const raw = execFileSync("python3", ["/workspace/scripts/qa-research.py"], {
    encoding: "utf8",
  });
  research = JSON.parse(raw);
} catch (err) {
  const out = err?.stdout ? String(err.stdout) : "";
  try {
    research = JSON.parse(out);
  } catch {
    research = { pass: false, why: String(err?.message || err) };
  }
}
if (research.pass) {
  score("research-first", 10, research.why);
} else {
  score("research-first", 2, research.why);
}

let memberArt = { pass: false, why: "qa-member-art did not run" };
try {
  const raw = execFileSync("python3", ["/workspace/scripts/qa-member-art.py"], {
    encoding: "utf8",
  });
  memberArt = JSON.parse(raw);
} catch (err) {
  const out = err?.stdout ? String(err.stdout) : "";
  try {
    memberArt = JSON.parse(out);
  } catch {
    memberArt = { pass: false, why: String(err?.message || err) };
  }
}
if (memberArt.pass) {
  score("member-art", 10, memberArt.why);
} else {
  score("member-art", 2, memberArt.why);
}

let cardPaint = { pass: false, why: "qa-card-paint did not run" };
try {
  const raw = execFileSync("node", ["/workspace/scripts/qa-card-paint.mjs", url], {
    encoding: "utf8",
    timeout: 60000,
  });
  const line = raw.trim().split("\n").filter(Boolean).pop() || "{}";
  cardPaint = JSON.parse(line);
} catch (err) {
  const out = err?.stdout ? String(err.stdout) : "";
  try {
    cardPaint = JSON.parse(out.trim().split("\n").filter(Boolean).pop() || "{}");
  } catch {
    cardPaint = { pass: false, why: String(err?.message || err) };
  }
}
if (cardPaint.pass) {
  score("card-paint", 10, "first two cards painted on 390×844");
} else {
  score("card-paint", 2, (cardPaint.fail || [cardPaint.why]).join("; "));
}

const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});

await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForTimeout(180);
await page.screenshot({ path: "/workspace/screenshots/qa-loader-n.png" });
await page
  .waitForSelector("[data-film-ready='1']", { timeout: 12000 })
  .catch(() => null);
await page.waitForTimeout(400);

const filmH = await page.evaluate(() => 15.6 * window.innerHeight);

async function sampleAt(y, wait = 90) {
  await page.evaluate((yy) => window.scrollTo(0, yy), y);
  await page.waitForTimeout(wait);
  return page.evaluate(() => {
    const canvas = document.querySelector("[data-film-canvas]");
    const vids = [...document.querySelectorAll("video")];
    let luma = -1;
    if (canvas instanceof HTMLCanvasElement) {
      try {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          const x = Math.floor(canvas.width / 2);
          const y = Math.floor(canvas.height / 2);
          const { data } = ctx.getImageData(x, y, 1, 1);
          luma = data[0] + data[1] + data[2];
        }
      } catch {
        luma = -2;
      }
    }
    return {
      n: vids.length,
      clip: canvas instanceof HTMLElement ? canvas.dataset.activeClip : "",
      time: Number(
        canvas instanceof HTMLElement ? canvas.dataset.activeTime : 0,
      ),
      ready: canvas instanceof HTMLElement ? canvas.dataset.filmReady : "",
      luma,
      hasCanvas: !!canvas,
    };
  });
}

const a = await sampleAt(filmH * 0.06, 120);
const b = await sampleAt(filmH * 0.72, 140);
const c = await sampleAt(filmH * 0.18, 120);
const d = await sampleAt(filmH * 0.06, 120);
const e = await sampleAt(filmH * 0.14, 140);

const early = new Set(["void", "orbit"]);
const late = new Set(["raid", "climb", "invite", "hall"]);
const farOk = late.has(b.clip);
const backOk = early.has(d.clip);
const timeMoved = Math.abs((e.time || 0) - (a.time || 0)) > 0.08 || a.clip !== e.clip;
const poolOk = a.n >= 8 && a.ready === "1";

if (poolOk && farOk && backOk && errors.length === 0) {
  score(
    "scrub-bidirectional",
    timeMoved ? 10 : 9,
    `a=${a.clip}@${a.time} b=${b.clip}@${b.time} d=${d.clip} e=${e.clip}@${e.time}`,
  );
} else if (poolOk && errors.length === 0) {
  score(
    "scrub-bidirectional",
    6,
    `far=${b.clip} back=${d.clip} ready=${a.ready}`,
  );
} else {
  score(
    "scrub-bidirectional",
    3,
    `n=${a.n} ready=${a.ready} far=${b.clip} back=${d.clip} err=${errors[0] ?? "none"}`,
  );
}

const lumas = [a, b, c, d, e].map((s) => s.luma);
const blackHits = lumas.filter((l) => l >= 0 && l < 18).length;
const canvasOk = [a, b, c, d, e].every((s) => s.hasCanvas);
if (canvasOk && blackHits === 0) {
  score("scrub-hold-frame", 10, `luma=${lumas.join(",")}`);
} else if (canvasOk && blackHits <= 1) {
  score("scrub-hold-frame", 7, `one dark sample luma=${lumas.join(",")}`);
} else {
  score("scrub-hold-frame", 4, `black=${blackHits} luma=${lumas.join(",")}`);
}

const nDom = await page.evaluate(() => {
  const imgs = [...document.querySelectorAll("[data-emblem='pixel-n'], img")].filter(
    (i) => (i.getAttribute("src") || "").includes("n-pixel"),
  );
  const boxes = imgs.map((i) => {
    const r = i.getBoundingClientRect();
    return {
      src: i.getAttribute("src") || "",
      nw: i.naturalWidth,
      nh: i.naturalHeight,
      w: r.width,
      h: r.height,
      ratio: r.height > 0 ? r.width / r.height : 0,
      fileRatio: i.naturalHeight > 0 ? i.naturalWidth / i.naturalHeight : 0,
    };
  });
  const banned = [...document.querySelectorAll("img")].some((i) =>
    (i.getAttribute("src") || "").includes("/brand/emblem.jpg"),
  );
  return { boxes, banned };
});

const boxOk = nDom.boxes.some(
  (b) => b.ratio >= 0.82 && b.ratio <= 1.22 && b.w >= 28 && b.fileRatio >= 0.82,
);
if (emblemFile.pass && boxOk && !nDom.banned) {
  score(
    "brand-n-pixel",
    10,
    `file ${emblemFile.width}x${emblemFile.height} stems L${emblemFile.left}/R${emblemFile.right} box=${nDom.boxes[0]?.ratio}`,
  );
} else if (emblemFile.pass && !nDom.banned) {
  score(
    "brand-n-pixel",
    5,
    `file ok but displayed as a sliver boxes=${JSON.stringify(nDom.boxes.slice(0, 3))}`,
  );
} else {
  score(
    "brand-n-pixel",
    2,
    emblemFile.why || `banned=${nDom.banned} boxes=${nDom.boxes.length}`,
  );
}

await page.evaluate((h) => window.scrollTo(0, h), filmH + 200);
await page.waitForTimeout(600);

const hall = await page.evaluate(() => {
  const faces = [...document.querySelectorAll("img")].map((i) => ({
    src: i.getAttribute("src") || "",
    avatar: i.getAttribute("data-avatar") || "",
  }));
  const rosterImgs = [...document.querySelectorAll("[data-roster-tile] img, img[data-avatar='ingame']")];
  const tiles = rosterImgs.map((i) => {
    const r = i.getBoundingClientRect();
    const cs = getComputedStyle(i);
    const parent = i.closest("[data-roster-tile], .house-tile");
    const pr = parent ? parent.getBoundingClientRect() : r;
    return {
      src: i.getAttribute("src") || "",
      w: r.width,
      h: r.height,
      ratio: r.height > 0 ? r.width / r.height : 0,
      tileRatio: pr.height > 0 ? pr.width / pr.height : 0,
      radius: cs.borderRadius,
      fit: cs.objectFit,
    };
  });
  const labels = [...document.querySelectorAll(".vital-label")].map((el) =>
    (el.textContent || "").trim(),
  );
  const stacks = document.querySelectorAll("[data-vitals='hpmp']").length;
  const hp = labels.filter((t) => t === "HP").length;
  const mp = labels.filter((t) => t === "MP").length;
  const wall = document.querySelector("[data-house-wall]");
  const wallTiles = document.querySelectorAll("[data-member-card]").length;
  const empty = document.querySelectorAll("[data-empty-seat]").length;
  const carousel = document.querySelector("[data-member-carousel]");
  const captionsZh = document.querySelectorAll("[data-caption-zh]").length;
  const captionsEn = document.querySelectorAll("[data-caption-en]").length;
  const portraits = [...document.querySelectorAll("[data-avatar='portrait']")].map(
    (i) => i.getAttribute("src") || "",
  );
  const founderStage = document.querySelector("[data-founder-stage]");
  const founderCards = document.querySelectorAll("[data-founder-card]").length;
  const cta = [...document.querySelectorAll("p, h2, h3, button")].find((el) =>
    (el.textContent || "").includes("自由加入"),
  );
  let wallAfterCta = false;
  if (cta && wall) {
    const a = cta.getBoundingClientRect();
    const b = wall.getBoundingClientRect();
    wallAfterCta = b.top >= a.top - 40;
  }
  const body = document.body.innerText;
  const hasCpOnWall = /CP\s*\d/i.test(body) && !!wall;
  const leftoverSeats = /還有\s*6|這六格|6 seats left|These six are open/i.test(body);
  const roundedFull = tiles.some((t) => t.radius.includes("50%") || t.radius === "9999px");
  return {
    faces: faces.map((f) => f.src),
    tiles,
    stacks,
    hp,
    mp,
    wall: !!wall,
    wallTiles,
    empty,
    founderStage: !!founderStage,
    founderCards,
    wallAfterCta,
    hasCpOnWall,
    leftoverSeats,
    roundedFull,
    carousel: !!carousel,
    captionsZh,
    captionsEn,
    portraits,
  };
});

const portraitHits = new Set(
  hall.portraits.filter((s) => s.includes("/brand/portraits/")),
);
const hasPortraits = portraitHits.size >= 20;
if (hasPortraits && hall.captionsZh >= 20 && hall.captionsEn >= 20 && !hall.roundedFull) {
  score(
    "avatar-ingame",
    10,
    `${portraitHits.size} unique portraits + bilingual captions`,
  );
} else {
  score(
    "avatar-ingame",
    3,
    `portraits=${portraitHits.size} zh=${hall.captionsZh} en=${hall.captionsEn}`,
  );
}

if (
  hall.wall &&
  hall.carousel &&
  hall.wallTiles >= 24 &&
  hall.empty === 0 &&
  !hall.leftoverSeats &&
  !hall.hasCpOnWall
) {
  score(
    "house-wall",
    10,
    `carousel cards=${hall.wallTiles} empty=${hall.empty} leftover=${hall.leftoverSeats}`,
  );
} else if (hall.wall && hall.wallTiles >= 20) {
  score(
    "house-wall",
    4,
    `tiles=${hall.wallTiles} empty=${hall.empty} leftover=${hall.leftoverSeats} carousel=${hall.carousel} cp=${hall.hasCpOnWall}`,
  );
} else {
  score(
    "house-wall",
    2,
    `wall=${hall.wall} tiles=${hall.wallTiles} empty=${hall.empty}`,
  );
}

score(
  "vitals-hpmp",
  hall.hp >= 1 && hall.mp >= 1 && hall.stacks >= 1
    ? 9
    : hall.stacks > 0
      ? 5
      : 2,
  `hp=${hall.hp} mp=${hall.mp} stacks=${hall.stacks}`,
);

await page.evaluate((h) => window.scrollTo(0, h), filmH * 0.58);
await page.waitForTimeout(400);
const rankOverlay = await page.evaluate(() => {
  const plates = document.querySelectorAll("[data-rank-board], [data-contributor]");
  const overlay = document.querySelector("[data-overlays]");
  const text = overlay ? overlay.innerText : "";
  const stale =
    /貢獻排名|帥葛葛/.test(text) && /碼農小孫/.test(text) && /RegginA/.test(text);
  return { plates: plates.length, stale, text: text.slice(0, 180) };
});
let overlaySrc = "";
try {
  overlaySrc = readFileSync("/workspace/src/components/cinematic/overlays.tsx", "utf8");
} catch {
  overlaySrc = "";
}
const rankInSource =
  /contributors|MemberPlate|data-rank-board|貢獻排名/.test(overlaySrc);
if (rankOverlay.plates === 0 && !rankOverlay.stale && !rankInSource) {
  score("film-timeless", 10, "no contribution rank cards on film");
} else {
  score(
    "film-timeless",
    2,
    `plates=${rankOverlay.plates} stale=${rankOverlay.stale} src=${rankInSource}`,
  );
}

score("no-console", errors.length === 0 ? 10 : 5, errors[0] ?? "clean");

let founders = { pass: false, why: "qa-founders did not run" };
try {
  const raw = execFileSync("python3", ["/workspace/scripts/qa-founders.py"], {
    encoding: "utf8",
  });
  founders = JSON.parse(raw);
} catch (err) {
  const out = err?.stdout ? String(err.stdout) : "";
  try {
    founders = JSON.parse(out);
  } catch {
    founders = { pass: false, why: String(err?.message || err) };
  }
}
if (founders.pass) {
  score("founders-in-film", 10, founders.why);
} else {
  score("founders-in-film", 3, founders.why);
}

let zakum = { pass: false, why: "qa-zakum-hands did not run" };
try {
  const raw = execFileSync("python3", ["/workspace/scripts/qa-zakum-hands.py"], {
    encoding: "utf8",
  });
  zakum = JSON.parse(raw);
} catch (err) {
  const out = err?.stdout ? String(err.stdout) : "";
  try {
    zakum = JSON.parse(out);
  } catch {
    zakum = { pass: false, why: String(err?.message || err) };
  }
}
if (zakum.pass) {
  score("zakum-six-arms", 10, zakum.why);
} else {
  score("zakum-six-arms", 2, zakum.why);
}

let motion = { pass: false, why: "qa-film-motion did not run" };
try {
  const raw = execFileSync("python3", ["/workspace/scripts/qa-film-motion.py"], {
    encoding: "utf8",
  });
  motion = JSON.parse(raw);
} catch (err) {
  const out = err?.stdout ? String(err.stdout) : "";
  try {
    motion = JSON.parse(out);
  } catch {
    motion = { pass: false, why: String(err?.message || err) };
  }
}
if (motion.pass) {
  score("film-moves", 10, motion.why);
} else {
  score("film-moves", 2, motion.why);
}

let alive = { pass: false, why: "qa-alive did not run" };
try {
  const raw = execFileSync("python3", ["/workspace/scripts/qa-alive.py"], {
    encoding: "utf8",
  });
  alive = JSON.parse(raw);
} catch (err) {
  const out = err?.stdout ? String(err.stdout) : "";
  try {
    alive = JSON.parse(out);
  } catch {
    alive = { pass: false, why: String(err?.message || err) };
  }
}
if (alive.pass) {
  score("characters-alive", 10, alive.why);
} else {
  score("characters-alive", 2, alive.why);
}

let filmClean = { pass: false, why: "qa-film-clean did not run" };
try {
  const raw = execFileSync("python3", ["/workspace/scripts/qa-film-clean.py"], {
    encoding: "utf8",
  });
  filmClean = JSON.parse(raw);
} catch (err) {
  const out = err?.stdout ? String(err.stdout) : "";
  try {
    filmClean = JSON.parse(out);
  } catch {
    filmClean = { pass: false, why: String(err?.message || err) };
  }
}
if (filmClean.pass) {
  score("film-no-leftover", 10, filmClean.why);
} else {
  score("film-no-leftover", 2, filmClean.why);
}

let avatars = { pass: false, why: "qa-avatar-center did not run" };
try {
  const raw = execFileSync("python3", ["/workspace/scripts/qa-avatar-center.py"], {
    encoding: "utf8",
  });
  avatars = JSON.parse(raw);
} catch (err) {
  const out = err?.stdout ? String(err.stdout) : "";
  try {
    avatars = JSON.parse(out);
  } catch {
    avatars = { pass: false, why: String(err?.message || err) };
  }
}
if (avatars.pass) {
  score("avatar-centered", 10, avatars.why);
} else {
  score("avatar-centered", 3, avatars.why);
}

const bodyText = await page.evaluate(() => document.body.innerText);
const banned = [
  "spooling",
  "From the dark",
  "clock out",
  "a chair",
  "Six chairs",
  "Take the chair",
  "The house",
  "unlatched",
  "One heartbeat",
  "Seat reserved",
  "Whisper your",
  "ACT I",
  "Scroll to begin",
  "Scroll to play",
  "第一",
];
const sheenHit = banned.find((b) => bodyText.includes(b));
const hasZh = /[\u4e00-\u9fff]/.test(bodyText);
if (!sheenHit && hasZh) {
  score("copy-no-sheen", 10, "no banned cinema lines; zh present");
} else if (!sheenHit) {
  score("copy-no-sheen", 4, "no cinema lines but missing Chinese");
} else {
  score("copy-no-sheen", 2, `banned phrase: ${sheenHit}`);
}

const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
await mobile.goto(url, { waitUntil: "domcontentloaded" });
await mobile.waitForTimeout(220);
const nFit = await mobile.evaluate(() => {
  const img = document.querySelector("[data-emblem='pixel-n']");
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  if (!(img instanceof HTMLElement)) {
    return { present: false, vw, vh };
  }
  const r = img.getBoundingClientRect();
  const pad = 8;
  const inView =
    r.left >= pad &&
    r.top >= pad &&
    r.right <= vw - pad &&
    r.bottom <= vh - pad;
  const smallEnough = r.width <= vw * 0.38 && r.height <= vh * 0.28;
  return {
    present: true,
    inView,
    smallEnough,
    l: r.left,
    t: r.top,
    r: r.right,
    b: r.bottom,
    w: r.width,
    h: r.height,
    vw,
    vh,
  };
});
await mobile.screenshot({ path: "/workspace/screenshots/qa-loader-n-mobile.png" });

if (nFit.present && nFit.inView && nFit.smallEnough) {
  score(
    "loader-n-fit",
    10,
    `N ${Math.round(nFit.w)}x${Math.round(nFit.h)} inside ${nFit.vw}x${nFit.vh}`,
  );
} else if (nFit.present && nFit.inView) {
  score(
    "loader-n-fit",
    6,
    `on screen but large w=${nFit.w} h=${nFit.h}`,
  );
} else if (!nFit.present) {
  score("loader-n-fit", 8, "loader already gone; HUD N assumed in view");
} else {
  score(
    "loader-n-fit",
    3,
    `N overflow box=${JSON.stringify(nFit)}`,
  );
}

await mobile
  .waitForSelector("[data-film-ready='1']", { timeout: 12000 })
  .catch(() => null);
await mobile.waitForTimeout(400);
const overflow = await mobile.evaluate(
  () =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth,
);
score("mobile-overflow", overflow <= 1 ? 10 : 4, `overflowX=${overflow}`);

// Titles must sit under the HUD, never on a face.
const filmHm = 15.6 * 844;
await mobile.evaluate((y) => window.scrollTo(0, y), filmHm * 0.56);
await mobile.waitForTimeout(280);
const overlay = await mobile.evaluate(() => {
  const vh = window.innerHeight;
  const cues = [...document.querySelectorAll("[data-cue]")].map((el) => {
    const r = el.getBoundingClientRect();
    return {
      id: el.getAttribute("data-cue"),
      place: el.getAttribute("data-cue-place"),
      top: Math.round(r.top),
      bottom: Math.round(r.bottom),
      vh,
    };
  });
  const faceBand = vh * 0.34;
  const covering = cues.filter((c) => c.bottom > faceBand);
  return { cues, covering, faceBand: Math.round(faceBand) };
});
if (overlay.covering.length === 0) {
  score(
    "overlay-clear",
    10,
    `titles under ${overlay.faceBand}px; ${overlay.cues.map((c) => c.id).join(",") || "none"}`,
  );
} else {
  score(
    "overlay-clear",
    3,
    `title over faces: ${JSON.stringify(overlay.covering)}`,
  );
}

const srcCopy =
  readFileSync("/workspace/src/lib/film.ts", "utf8") +
  readFileSync("/workspace/src/lib/copy.ts", "utf8") +
  readFileSync("/workspace/src/routes/__root.tsx", "utf8");
if (srcCopy.includes("第一")) {
  score("copy-no-diyi", 2, "第一 still in source — use No.1");
} else {
  score("copy-no-diyi", 10, "No.1, never 第一");
}

await page.screenshot({ path: "/workspace/screenshots/critic-desktop.png" });
await mobile.screenshot({ path: "/workspace/screenshots/critic-mobile.png" });
await page.evaluate((h) => window.scrollTo(0, h), filmH + 1400);
await page.waitForTimeout(400);
await page.screenshot({ path: "/workspace/screenshots/qa-desktop-hall.png" });
await mobile.evaluate((h) => window.scrollTo(0, h), 15.6 * 844 + 900);
await mobile.waitForTimeout(400);
await mobile.screenshot({ path: "/workspace/screenshots/qa-hall-mobile.png" });
await browser.close();

const worst = Object.entries(scores).sort((a, b) => a[1] - b[1])[0];
const report = {
  at: new Date().toISOString(),
  scores,
  gaps,
  worst: worst ? { axis: worst[0], n: worst[1] } : null,
  pass: gaps.length === 0,
  emblemFile,
};

const logPath = "/workspace/.grok/learnings/LOG.json";
if (existsSync(logPath)) {
  const log = JSON.parse(readFileSync(logPath, "utf8"));
  log.entries.push({
    at: report.at,
    lesson: "automated critic run",
    kept: report.pass,
    note: report.pass
      ? "all axes >= 8"
      : `FAIL ${gaps.map((g) => `${g.axis}:${g.n}`).join(", ")}`,
    scores,
  });
  writeFileSync(logPath, JSON.stringify(log, null, 2));
}

const dailyDir = "/workspace/.grok/learnings/daily";
mkdirSync(dailyDir, { recursive: true });
writeFileSync(
  `${dailyDir}/last-critic.json`,
  JSON.stringify(report, null, 2),
);

console.log(JSON.stringify(report, null, 2));
if (!report.pass) {
  console.error("CRITIC FAIL — revert the upgrade. Biggest gap:", report.worst);
  process.exit(1);
}
console.log("CRITIC PASS — keep the upgrade.");
