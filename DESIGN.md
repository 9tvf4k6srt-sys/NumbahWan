# DESIGN.md — NumbahWan guild LP v2 (SUPER RED)

**Bar:** NumbahWan-LP-v2 Foundation sha `dfc0b141de1c43020b70c977392f46dcde3b4d326307b40866ed84b27cf7dc45`  
**KEEP:** Design-Taste-AntiSlop `4aa03b3ff344f6b2ae09d48684b1cf1b758b7fc03c37c8aa0c9c1a7e290b303b`  
**As of:** 2026-09-13 · **Tone:** 搞笑中央 parody — NOT real agitation  
**Archive:** cream v1 → `archive/v1/`

## Reader job

Guildmates + recruits open a shareable page, laugh, feel belonging, want to **Join Freely** / show up **12月24日 第一屆中央大會**.

## Composition move (commit)

**SUPER RED congress poster + Maple photomontage.**  
Full saturated red field. Central upward hero = **總書記 RegginA** (¾ + staff + shutter shades). Supporting cast = gold/white framed bust grid (≥ face energy of grok.me). Cream letterpress as **dominant field = REJECT**.

## Exact Sources (fetched 2026-09-13)

| # | URL | Role |
| --- | --- | --- |
| S1 | https://chineseposters.net/themes/mao-cult | Craft: 红光亮, red field, upward hero, bold slogan — **parody only** |
| S2 | https://numbahwanguild.grok.me | Beat bar: ~24 portraits + join — must clearly exceed on red craft + framing |

## 8 grammar slots

### 1. Type scale
| Role | Spec |
| --- | --- |
| display-zh | `clamp(2.5rem, 10vw, 5rem)` / 900 / lh 1.05 — **Noto Sans TC** white on red |
| display-latin | `clamp(2rem, 8vw, 4rem)` / 800 — **Archivo Black** white/gold |
| heading | `1.25rem` / 900 white |
| body | `1rem` / 400 — white @ 92% or gold |
| label | `0.7rem` / 700 / tracking 0.06em — gold stamp |
| mono | IBM Plex Mono — Lv / counts only |

### 2. Spacing
Base 4px. Within 2–4 · between 4–6 · hero→grid 8–10. Dense poster packing — not sparse SaaS.

### 3. Color (SUPER RED dominant)
| Token | Value | Job |
| --- | --- | --- |
| `--field` | `#c41e1e` | **Page canvas** (not cream, not #07080c) |
| `--field-deep` | `#9b1212` | Bands / footer |
| `--ink-on-red` | `#fff8f0` | Primary type |
| `--gold` | `#f0d060` | Frames, stars, date plaque |
| `--n-orange` | `#ff6a00` | N mark only |
| `--stamp-red` | `#ffe8e0` | Stamp fill contrast |
| `--line` | `rgba(255,248,240,0.35)` | Hairlines |

**REJECT as page field:** cream `#f3e6d0`, dark SaaS `#07080c`, purple mesh.

### 4. Layout
- Mobile-first single column
- Hero: full-bleed red, RegginA framed crest center/top, slogan below
- Grid: auto-fill `minmax(7.5rem,1fr)` bust frames — not 3 identical feature cards as whole page
- Measure slogans ≤ 20ch where possible for woodcut punch

### 5. Surface / Maple framing
- Portrait frame: **4px gold** + 2px white inset; radius **2px**
- Rank pennant: small gold/white bar over frame (title)
- No glass blur; no soft 20px card radius
- Photomontage: portraits as graphic units on red (红光亮 — keep faces bright)

### 6. Motion
Stillness default. Optional 120ms opacity on CTA. No marquee/bounce.

### 7. Composition
Upward-hero first viewport (spectator looks up at GS). Slogan type as structure. Roster = supporting cast photomontage.

### 8. Hard rejects
1. Cream / paper as **dominant** page field  
2. Purple AI gradient / mesh  
3. Glassmorphism / blobs  
4. Three identical feature cards as whole page  
5. Inter-only / Geist-only voice  
6. Dark grok.me chrome clone as “win”  
7. Bounce / marquee  
8. Soft border on every card  
9. Text-only manifesto (zero faces)  
10. Real political agitation / real leaders  

## CSS lock

```css
:root {
  --field: #c41e1e;
  --field-deep: #9b1212;
  --ink-on-red: #fff8f0;
  --gold: #f0d060;
  --n-orange: #ff6a00;
  --stamp-fg: #c41e1e;
  --stamp-bg: #fff8f0;
  --font-zh: "Noto Sans TC", "PingFang TC", sans-serif;
  --font-display: "Archivo Black", "Arial Black", sans-serif;
  --font-mono: "IBM Plex Mono", ui-monospace, monospace;
  --radius: 2px;
  --space-1: 4px;
}
```

## Portrait pipeline
1. Prefer `assets/portraits/*.jpg` (from user’s grok.me domain, fair beat) + owned `owned/reggina-gs-staff.png` for $ staff irony.  
2. Bust frames for members; GS hero shows shades + staff.  
3. Credit in footer: portraits also live on numbahwanguild.grok.me.

## Eval
| Arm | Path |
| --- | --- |
| Baseline AntiSlop | `baseline-without/index.html` (purple Inter glass — KEEP) |
| v2 polished | `index.html` |
| v1 cream archive | `archive/v1/` |
