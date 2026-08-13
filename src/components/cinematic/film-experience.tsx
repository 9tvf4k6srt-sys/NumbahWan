import { useEffect, useMemo, useRef, useState } from "react";
import { CLIPS, FILM_VH, clamp01 } from "@/lib/film";
import { FilmVideo } from "./film-video";
import { Hall } from "./hall";
import { Hud } from "./hud";
import { JoinPanel } from "./join-panel";
import { LeafField } from "./leaf-field";
import { Loader } from "./loader";
import { Overlays } from "./overlays";

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  return reduced;
}

function useIsTouch() {
  const [touch, setTouch] = useState(true);
  useEffect(() => {
    setTouch(window.matchMedia("(pointer: coarse)").matches);
  }, []);
  return touch;
}

export function FilmExperience() {
  const reduced = usePrefersReducedMotion();
  const touch = useIsTouch();
  const [ready, setReady] = useState(false);
  const [boot, setBoot] = useState(0.08);
  const [progress, setProgress] = useState(0);
  const [veil, setVeil] = useState(0);
  const [joinOpen, setJoinOpen] = useState(false);
  const targetRef = useRef(0);
  const displayRef = useRef(0);

  useEffect(() => {
    if (ready) return;
    const id = window.setInterval(() => {
      setBoot((b) => (b < 0.92 ? b + 0.04 : b));
    }, 180);
    const maxWait = window.setTimeout(() => setReady(true), 9000);
    return () => {
      window.clearInterval(id);
      window.clearTimeout(maxWait);
    };
  }, [ready]);

  const onFilmReady = () => {
    setBoot(1);
    setReady(true);
  };

  useEffect(() => {
    if (reduced) return;
    let raf = 0;
    // Tight lerp for slow scroll. SNAP on fast / reverse jumps so the
    // decoder is not forced through every intermediate clip.
    const lerp = touch ? 0.55 : 0.34;
    const SNAP = 0.04;
    const read = () => {
      const el = document.documentElement;
      const vh = el.clientHeight;
      const filmEnd = (FILM_VH / 100) * vh;
      targetRef.current = clamp01(el.scrollTop / Math.max(1, filmEnd));
      const v = clamp01((el.scrollTop - (filmEnd - vh * 0.42)) / (vh * 0.55));
      setVeil(v);
    };
    const tick = () => {
      read();
      const delta = targetRef.current - displayRef.current;
      if (Math.abs(delta) > SNAP) {
        displayRef.current = targetRef.current;
      } else {
        displayRef.current += delta * lerp;
        if (Math.abs(targetRef.current - displayRef.current) < 0.00025) {
          displayRef.current = targetRef.current;
        }
      }
      setProgress(displayRef.current);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduced, touch]);

  const leafIntensity = useMemo(() => {
    const base =
      progress < 0.22
        ? 0.4 + progress * 1.6
        : progress > 0.88
          ? 0.55 + (progress - 0.88) * 2.4
          : progress > 0.74 && progress < 0.88
            ? 0.35
            : 0.1;
    return base * (1 - veil);
  }, [progress, veil]);

  const openJoin = () => setJoinOpen(true);

  if (reduced) {
    return (
      <ReducedFilm
        onJoin={openJoin}
        joinOpen={joinOpen}
        onClose={() => setJoinOpen(false)}
      />
    );
  }

  return (
    <div id="top" className="relative bg-void text-fog">
      {!ready ? <Loader progress={boot} /> : null}
      <FilmVideo progress={progress} onReady={onFilmReady} />
      <div className="grain z-10" />
      <div className="vignette z-10" />
      <div
        className="pointer-events-none fixed inset-0 z-[15] bg-void"
        style={{ opacity: veil }}
      />
      <LeafField intensity={ready ? leafIntensity : 0} />
      <Overlays progress={progress} veil={veil} />
      <Hud progress={progress} onJoin={openJoin} veil={veil} />
      <div style={{ height: `${FILM_VH}vh` }} aria-hidden="true" />
      <Hall onJoin={openJoin} />
      <JoinPanel open={joinOpen} onClose={() => setJoinOpen(false)} />
    </div>
  );
}

function ReducedFilm({
  onJoin,
  joinOpen,
  onClose,
}: {
  onJoin: () => void;
  joinOpen: boolean;
  onClose: () => void;
}) {
  return (
    <div id="top" className="bg-void text-fog">
      <Hud progress={0} onJoin={onJoin} />
      <div className="space-y-0 pt-16">
        {CLIPS.filter(
          (c, i, arr) => arr.findIndex((x) => x.act === c.act) === i,
        ).map((clip) => (
          <section key={clip.id} className="relative min-h-[70dvh]">
            <img
              src={clip.still}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-void/45" />
          </section>
        ))}
      </div>
      <Hall onJoin={onJoin} />
      <JoinPanel open={joinOpen} onClose={onClose} />
    </div>
  );
}
