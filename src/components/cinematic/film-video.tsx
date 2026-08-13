import { useEffect, useRef } from "react";
import { CLIPS, sampleFilm } from "@/lib/film";

/**
 * HARD RULE — multi-clip scroll-scrub (compounded):
 * 1. One <video> per clip, all mounted. Never a 2-buffer swap.
 * 2. Prefetch every clip as a blob so fast/reverse seek is local I/O.
 * 3. Paint to canvas. NEVER fill black — mid-seek we keep the last frame.
 * 4. Latest-wins seek. Never play(). iOS only shows frames via currentTime.
 * 5. Paint while seeking if videoWidth > 0. Seeking drops readyState.
 * 6. Hold the previous clip until the incoming clip has a decoded frame.
 * 7. Warm neighbors only on clip change (not every frame).
 * 8. Void clip paints the EXACT brand N on top and crash-zooms it with
 *    scroll. A still letter with falling leaves is not a first shot.
 */
export function FilmVideo({
  progress,
  onReady,
}: {
  progress: number;
  onReady?: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const poolRef = useRef<(HTMLVideoElement | null)[]>([]);
  const progressRef = useRef(progress);
  progressRef.current = progress;
  const pendingRef = useRef<Map<number, number>>(new Map());
  const paintedIdxRef = useRef(0);
  const warmedIdxRef = useRef(-1);
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;
    let alive = true;
    let raf = 0;
    const objectUrls: string[] = [];

    const brandN = new Image();
    brandN.decoding = "async";
    brandN.src = "/brand/n-pixel.png";

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const pool = poolRef.current;
    const onSeeked = (idx: number) => () => {
      const el = pool[idx];
      if (!el) return;
      const pending = pendingRef.current.get(idx);
      if (pending === undefined) return;
      pendingRef.current.delete(idx);
      if (Math.abs(el.currentTime - pending) >= 1 / 48) {
        try {
          el.currentTime = pending;
        } catch {
          /* ignore */
        }
      }
    };

    CLIPS.forEach((_, i) => {
      const el = pool[i];
      if (!el) return;
      el.muted = true;
      el.defaultMuted = true;
      el.playsInline = true;
      el.preload = "auto";
      el.setAttribute("playsinline", "");
      el.setAttribute("webkit-playsinline", "");
      el.controls = false;
      el.disablePictureInPicture = true;
      el.addEventListener("seeked", onSeeked(i));
    });

    let decoded = 0;
    const markDecoded = () => {
      decoded += 1;
      if (decoded >= CLIPS.length && alive) {
        canvas.dataset.filmReady = "1";
        onReadyRef.current?.();
      }
    };

    void Promise.all(
      CLIPS.map(async (clip, i) => {
        try {
          const res = await fetch(clip.src, { cache: "force-cache" });
          const blob = await res.blob();
          if (!alive) return;
          const url = URL.createObjectURL(blob);
          objectUrls.push(url);
          const el = pool[i];
          if (!el) {
            markDecoded();
            return;
          }
          const onData = () => {
            try {
              el.currentTime = 0.001;
            } catch {
              /* ignore */
            }
            markDecoded();
          };
          el.addEventListener("loadeddata", onData, { once: true });
          el.src = url;
          el.setAttribute("data-src", clip.src);
          el.load();
        } catch {
          markDecoded();
        }
      }),
    );

    const hasFrame = (el: HTMLVideoElement | null) =>
      !!el && el.videoWidth > 1 && el.videoHeight > 1;

    const slamN = (local: number) => {
      if (!brandN.complete || brandN.naturalWidth < 8) return;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const t = Math.min(1, Math.max(0, local));
      // Hold a readable N, then cubic slam through the glass.
      const u = t < 0.1 ? t * 0.6 : 0.06 + ((t - 0.1) / 0.9) ** 2.35;
      const scale = 0.38 + u * 2.7;
      const size = Math.min(vw, vh) * scale;
      const x = (vw - size) / 2;
      const y = (vh - size) * 0.44;
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.shadowColor = `rgba(255, 106, 0, ${0.35 + t * 0.45})`;
      ctx.shadowBlur = 18 + t * 64;
      ctx.drawImage(brandN, x, y, size, size);
      ctx.restore();
      canvas.dataset.voidNScale = scale.toFixed(2);
    };

    const cover = (el: HTMLVideoElement, clipId = "") => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const iw = el.videoWidth || 16;
      const ih = el.videoHeight || 9;
      if (iw < 2 || ih < 2) return false;
      const ir = iw / ih;
      const cr = vw / vh;
      let dw: number;
      let dh: number;
      if (ir > cr) {
        dh = vh * 1.02;
        dw = dh * ir;
      } else {
        dw = vw * 1.02;
        dh = dw / ir;
      }
      ctx.drawImage(el, (vw - dw) / 2, (vh - dh) / 2, dw, dh);
      if (clipId === "void") {
        const sample = sampleFilm(progressRef.current);
        slamN(sample.clip.id === "void" ? sample.local : 0);
      }
      return true;
    };

    const seekLatest = (el: HTMLVideoElement, idx: number, t: number) => {
      const dur = el.duration;
      if (!Number.isFinite(dur) || dur <= 0) return;
      const clamped = Math.min(Math.max(t, 0.001), Math.max(0.001, dur - 0.04));
      if (el.seeking) {
        pendingRef.current.set(idx, clamped);
        return;
      }
      if (Math.abs(el.currentTime - clamped) >= 1 / 48) {
        try {
          el.currentTime = clamped;
        } catch {
          pendingRef.current.set(idx, clamped);
        }
      }
    };

    const warmNeighbors = (idx: number) => {
      if (warmedIdxRef.current === idx) return;
      warmedIdxRef.current = idx;
      const prev = pool[idx - 1];
      if (
        prev &&
        !prev.seeking &&
        Number.isFinite(prev.duration) &&
        prev.duration > 0
      ) {
        seekLatest(prev, idx - 1, prev.duration - 0.08);
      }
      const next = pool[idx + 1];
      if (
        next &&
        !next.seeking &&
        Number.isFinite(next.duration) &&
        next.duration > 0
      ) {
        seekLatest(next, idx + 1, 0.04);
      }
    };

    const tick = () => {
      if (!alive) return;
      const sample = sampleFilm(progressRef.current);
      const idx = Math.max(
        0,
        CLIPS.findIndex((c) => c.id === sample.clip.id),
      );
      const el = pool[idx];
      if (el) seekLatest(el, idx, sample.time);
      warmNeighbors(idx);

      canvas.dataset.activeClip = sample.clip.id;
      canvas.dataset.activeTime = sample.time.toFixed(3);

      const incomingReady = hasFrame(el);
      const painted = pool[paintedIdxRef.current];

      if (idx !== paintedIdxRef.current) {
        if (incomingReady && cover(el!, sample.clip.id)) {
          paintedIdxRef.current = idx;
        } else if (hasFrame(painted)) {
          cover(painted!, CLIPS[paintedIdxRef.current]?.id ?? "");
        }
      } else if (incomingReady) {
        cover(el!, sample.clip.id);
      } else if (hasFrame(painted)) {
        cover(painted!, CLIPS[paintedIdxRef.current]?.id ?? "");
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      pool.forEach((el, i) => {
        if (el) el.removeEventListener("seeked", onSeeked(i));
      });
      objectUrls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, []);

  return (
    <>
      <canvas
        ref={canvasRef}
        data-film-canvas="1"
        className="pointer-events-none fixed inset-0 z-0 h-dvh w-dvw"
      />
      <div
        className="pointer-events-none fixed top-0 left-0 h-px w-px overflow-hidden opacity-0"
        aria-hidden="true"
      >
        {CLIPS.map((clip, i) => (
          <video
            key={clip.id}
            ref={(el) => {
              poolRef.current[i] = el;
            }}
            muted
            playsInline
            preload="auto"
            tabIndex={-1}
          />
        ))}
      </div>
    </>
  );
}
