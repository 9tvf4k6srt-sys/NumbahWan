# DESIGN.md — NumbahWan LP v4 (room + likeness HARD GATE)

**Bar:** NumbahWan-LP-v4 Foundation sha `3becbdc6a8db61124c1b462f6f891ea69af42dbad0d3d7b1d62497bac5532c1a`  
**KEEP AntiSlop:** `4aa03b3f…`  
**SUPERSEDE:** v3 composition/likeness `ea444d3f…` → `archive/v3/`  
**Tone:** 搞笑中央 / 非政治宣傳 — parody only.

## Reader job
First viewport reads as an **ultra-real propaganda-era guild room** with **two dominant hanging portraits** (總書記 RegginA + 副書記 RegginO); laugh; Join Freely / 12·24.

## Composition move (PRIMARY)
**Room-dominant wall-portrait grammar** (HKBU 《关心集体》 + Great Hall interior feel).  
NOT cream postage-plate scrub. NOT full-site red CSS. NOT grok.me dump.

## Exact Sources
1. Craft room: HKBU 《关心集体》 wall-portrait grammar + chineseposters e37-66 Great Hall interior  
2. Likeness L1: `refs/gs-costume.jpeg` (wins on apparel conflict vs reggina.jpg)  
3. Likeness L2: `assets/portraits/reggino.jpg`  
4. Décor craft (supporting): chineseposters leifeng / Landsberger

## Likeness checklist — Critic HARD FAIL if miss

### RegginA / 總書記 (L1 = gs-costume.jpeg)
| Must | Spec |
| --- | --- |
| Hair | Blonde fringe / short–shoulder |
| Face | **White shutter shades** (horizontal slats) |
| Head | Thin black headband + upright ribbon ears |
| Coat | **White fur-collared trench / long coat** |
| Gloves | White + blue lightning |
| Shoes | White high-tops |
| Prop | **Gold winged $ staff** readable in first viewport |
| Skin | Dark / brown consistent with ref |

### RegginO / 副書記 (L2 = reggino.jpg)
| Must | Spec |
| --- | --- |
| Hair | Long voluminous **pink** waves |
| Head | Rose wreath + lantern ornament |
| Eyes | Large green |
| Dress | Rainbow-ruffle tutu |
| Boots | Tall black lace-up |
| Props | **Blue boxing gloves**; white teddy + gold gem |
| Skin | Dark / tanned consistent with ref |

**Process:** Critic compares hero portrait crops **side-by-side** to L1/L2 files. Soft-defer to B1 = FAIL.

## Scale rule
Each MAIN portrait frame ≥ ~35% of first-viewport width (combined GS+VGS dominate wall). Tiny centered postage plates = HARD REJECT.

## Density floor
≥ **6** Maple 宣传画 wall décor pieces + **2** dominant portraits + visible stamp.

## Hard rejects (1–9 class)
1. Tiny postage plates as primary  
2. Cream empty field without room interior  
3. Likeness miss vs L1/L2  
4. Soft-defer likeness/composition to B1  
5. Checklist-only paper+stamp+scrub without room GS/VGS  
6. Clone grok.me  
7. Full-site red CSS flood  
8. Real agitation  
9. Invented apparel / wrong hair

## Tokens (chrome only)
```css
--ink: #1a120c; --paper-ui: #1a120c; /* dark chrome under hero */
--vermillion: #c41e1e; --gold: #c9a227;
```
Hero is the **photo** `assets/v4/room-hero.png` — not CSS red field.

## Assets
- `assets/v4/room-hero.png` — composited room (owned L1/L2 pasted into frames)  
- `assets/v4/portrait-reggina-l1.png` / `portrait-reggino-l2.png` — crops for Evidence  
- Source refs unchanged under `refs/` + `assets/portraits/reggino.jpg`
