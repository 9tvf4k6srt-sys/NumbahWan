# Architecture

This document explains how the scroll-scrubbed film works, the constraints that shaped it, and the alternatives that were tried and dropped.

## 1. Goal and constraints

The home page is a short film that the visitor **drives with the scrollbar**. Scrolling down plays it forward, scrolling up plays it in reverse, and stopping holds the frame.

The hard constraints:

| Constraint | Consequence |
|---|---|
| Must feel like video, not a flipbook | Use a real video timeline (at least 24 fps), not a sequence of sparse still images |
| Must work on iOS Safari | No `play()`. iOS blocks or delays it, and only updates frames through `currentTime` seeks |
| Reverse scrubbing must be as smooth as forward | Every frame has to be decodable on its own, so clips use all-intra encoding |
| No black flash between clips | Never clear the canvas. Keep showing the previous clip until the next one has a decoded frame |
| Respect `prefers-reduced-motion` | Provide a separate static rendering path |

## 2. Data model: `src/lib/film.ts`

```
CLIPS (8)  ──weights──▶  WINDOWS  (contiguous [start,end) slices of 0…1)
                              │
progress p ──sampleFilm(p)────┴──▶ { clip, next, local ∈ [0,1], time (s) }
                              │
                              ├──▶ CUES   → cueOpacity(cue, p)   (subtitle fades)
                              └──▶ ACTS   → activeAct(p)         (HUD chapter)
```

* A clip's **weight** sets how much scroll distance it takes up, which is how pacing is controlled. The opening shot has weight 1.65, so it lingers longer than the others.
* `sampleFilm` is a **pure function**, so every invariant can be unit tested without a browser:
  * the windows tile `[0, 1]` with no gaps or overlaps
  * output is monotonic, so scrolling forward never moves the film backward
  * it never skips a clip
  * `time` stays below `duration − 0.05`, avoiding the decoder's unreliable last frame
  * out-of-range input is clamped, never thrown

See `tests/film.test.ts`.

## 3. Input loop: `film-experience.tsx`

A single `requestAnimationFrame` loop:

1. reads `scrollTop` and normalises it against the film height (`FILM_VH = 1560vh`)
2. eases the displayed progress toward the target (`lerp` = 0.34 on desktop, 0.55 on touch)
3. **snaps** when the gap is more than 0.04, so a fast fling or a jump to the top doesn't make the decoder seek through every clip in between
4. computes a `veil` value that fades the film to black as the member hall scrolls in

The scroll position is the only source of truth. The video elements never drive state.

## 4. Decoder pool: `film-video.tsx`

The rules below are numbered in the source comments too.

1. **One `<video>` per clip, all mounted.** A two-element swap re-attaches sources and flashes black on iOS.
2. **Prefetch every clip as a Blob URL.** After the first load, seeks read from memory instead of making network range requests.
3. **Paint to canvas.** Never fill it with black. While a seek is in progress, the previous frame stays on screen.
4. **Latest-wins seeks.** If a video is still seeking, the new target goes into `pendingRef` and replaces any older pending target. The `seeked` event then applies only the newest one.
5. **Paint while seeking** whenever `videoWidth > 0`. `readyState` drops during a seek even though a usable frame is still available.
6. **Hand-off between clips.** The outgoing clip keeps painting until the incoming one has a decoded frame.
7. **Warm the neighbours on clip change.** `prev` is seeked to its last frame and `next` to its first, so crossing a boundary in either direction is instant.
8. **Brand shot.** In the opening clip, the pixel-art "N" is drawn on top with nearest-neighbour scaling and a cubic crash-zoom tied to local progress.

The canvas is DPR-aware, capped at 2× to limit fill-rate cost on high-density phones.

### Encoding

`scripts/encode-i2v-clip.py` and `scripts/compose-lock.py` encode each clip as H.264 at 24 fps, **GOP = 1** (`-g 1 -keyint_min 1`), with no B-frames (`-bf 0`). `scripts/encode-scrub-film.sh` runs the QA checks first. You can verify it:

```bash
ffprobe -v error -select_streams v -skip_frame nokey -count_frames \
  -show_entries stream=nb_read_frames,nb_frames -of csv=p=0 public/film/video/03-field.mp4
# 145,145   ← every frame is a keyframe
```

The trade-off is file size, about 13–19 MB per 6 s clip at 720×1280, roughly 3–4× a normal GOP. That's acceptable here because clips are fetched once, cached as Blob URLs, and the film is the whole product.

## 5. Server and data

```
Browser ──submitJoin()──▶ TanStack Start server fn
                          ├─ parseJoinInput()   pure validator, shared with the client
                          └─ getSql()`insert …` parameterised tagged template
                                 │
                   DATABASE_URL? ├─ yes → Neon / Postgres (pg pool)
                                 └─ no  → PGLite (Postgres in WASM, on-disk)
```

* **Migrations** (`migrations/*.sql`) are the only source of schema. `scripts/migrate.mjs` applies them to `DATABASE_URL` during `npm run build`. Locally, `db.ts` applies the same files to PGLite at startup. Applied files are recorded in `_migrations`.
* **HMR-safe initialisation.** Database init promises live on `globalThis`, so Vite HMR can't open a second pool or run migrations twice in parallel.
* **Bundling PGLite.** PGLite loads `pglite.wasm` and `pglite.data` from its own package directory. Nitro's bundler inlines the JS but drops those binaries, so the Nitro config uses `traceDeps: ["@electric-sql/pglite*"]` to ship it as a real package. The E2E job runs against the production build specifically to catch this kind of bug.

## 6. Accessibility

* **Reduced motion.** `prefers-reduced-motion: reduce` renders one still per act plus the member hall. No video is downloaded.
* **Join modal.** It has `role="dialog"` and `aria-modal="true"`. Focus moves to the first field on open, Escape closes it, and focus returns to the button that opened it.
* **Language.** All copy is bilingual (Traditional Chinese first) and each language is tagged with `lang`, so screen readers switch voices.
* Decorative canvases (leaves, grain) are `aria-hidden`.

## 7. Testing pyramid

| Level | Tooling | What it protects |
|---|---|---|
| Unit | Vitest | Timeline maths, validator, data consistency |
| Content integrity | Vitest + fs | No broken asset references in shipped code |
| Tooling | `node --test` | Build plugins and OG/brand checks |
| E2E | Playwright on the **production** server | Film decodes and paints, scroll advances, modal a11y, DB write |

CI (`.github/workflows/ci.yml`, source in `docs/ci/ci.yml`) runs the first three plus a production build on every push and PR, then the E2E job against `node .output/server/index.mjs`.

## 8. Alternatives considered

| Approach | Why it was rejected |
|---|---|
| Image sequence (`<img>` or sprite per frame) | Hundreds of requests or huge sprites, and below 20 fps it reads as a flipbook |
| `video.play()` plus `playbackRate` | Blocked or delayed on iOS, can't play in reverse, and it drifts from scroll |
| A single concatenated video | One huge file. A seek near a boundary still has to decode across scenes, and pacing per scene isn't possible |
| WebCodecs `VideoDecoder` | Most control, but incomplete on older iOS versions and far more code for the same visual result |
| Two-element ping-pong swap | Flashes black on iOS when sources are re-attached |
