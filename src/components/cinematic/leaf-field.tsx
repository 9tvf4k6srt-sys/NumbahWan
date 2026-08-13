import { useEffect, useRef } from "react";

type Speck = {
  x: number;
  y: number;
  s: number;
  r: number;
  vr: number;
  vy: number;
  vx: number;
  a: number;
};

export function LeafField({ intensity }: { intensity: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const intensityRef = useRef(intensity);
  intensityRef.current = intensity;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const img = new Image();
    img.src = "/brand/leaf.png";
    let alive = true;
    let raf = 0;
    const specks: Speck[] = [];

    const spawn = (w: number, h: number) => {
      specks.push({
        x: Math.random() * w,
        y: -40 - Math.random() * h * 0.3,
        s: 10 + Math.random() * 22,
        r: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.03,
        vy: 0.25 + Math.random() * 0.55,
        vx: -0.15 + Math.random() * 0.4,
        a: 0.25 + Math.random() * 0.45,
      });
    };

    const resize = () => {
      const dpr = Math.min(1.5, window.devicePixelRatio || 1);
      canvas.width = Math.round(window.innerWidth * dpr);
      canvas.height = Math.round(window.innerHeight * dpr);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    for (let i = 0; i < 16; i += 1) {
      spawn(window.innerWidth, window.innerHeight);
      specks[i]!.y = Math.random() * window.innerHeight;
    }

    const tick = () => {
      if (!alive) return;
      const w = window.innerWidth;
      const h = window.innerHeight;
      const intensityNow = intensityRef.current;
      ctx.clearRect(0, 0, w, h);
      const want = intensityNow > 0.08 ? Math.round(10 + intensityNow * 18) : 0;
      while (specks.length < want) spawn(w, h);
      while (specks.length > want) specks.pop();
      if (img.complete) {
        for (const s of specks) {
          s.y += s.vy * (0.7 + intensityNow);
          s.x += s.vx + Math.sin(s.y * 0.01) * 0.2;
          s.r += s.vr;
          if (s.y > h + 50) {
            s.y = -40;
            s.x = Math.random() * w;
          }
          ctx.save();
          ctx.globalAlpha = s.a * Math.min(1, intensityNow * 1.6);
          ctx.translate(s.x, s.y);
          ctx.rotate(s.r);
          ctx.drawImage(img, -s.s / 2, -s.s / 2, s.s, s.s);
          ctx.restore();
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      className="pointer-events-none fixed inset-0 z-10 h-dvh w-full"
      aria-hidden="true"
    />
  );
}
