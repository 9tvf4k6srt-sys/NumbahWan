import { useEffect, useRef, useState } from "react";
import { copy } from "@/lib/copy";
import { memberCards } from "@/lib/members";
import { ChevronLeft, ChevronRight } from "lucide-react";

type HouseWallProps = {
  onJoin: () => void;
};

export function HouseWall({ onJoin }: HouseWallProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const current = memberCards[index] ?? memberCards[0]!;

  const go = (next: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    const clamped = Math.max(0, Math.min(memberCards.length - 1, next));
    const child = el.children[clamped] as HTMLElement | undefined;
    child?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    setIndex(clamped);
  };

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const onScroll = () => {
      const kids = [...el.children] as HTMLElement[];
      if (!kids.length) return;
      const mid = el.scrollLeft + el.clientWidth / 2;
      let best = 0;
      let dist = Infinity;
      kids.forEach((kid, i) => {
        const c = kid.offsetLeft + kid.offsetWidth / 2;
        const d = Math.abs(c - mid);
        if (d < dist) {
          dist = d;
          best = i;
        }
      });
      setIndex(best);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <section
      data-house-wall="1"
      data-member-carousel="1"
      className="relative mt-10 bg-ink shadow-[0_0_0_1px_rgb(255_255_255_/_0.06)]"
    >
      <div className="flex items-end justify-between gap-4 px-5 py-5 sm:px-8">
        <div>
          <p className="font-cjk text-sm text-amber" lang="zh-Hant">
            {copy.wallZh}
            <span className="ml-2 font-display text-mist" lang="en">
              {copy.wallEn}
            </span>
          </p>
          <p className="mt-1 font-cjk text-mist" lang="zh-Hant">
            {copy.wallLeadZh}
            <span className="ml-2 font-display" lang="en">
              {copy.wallLeadEn}
            </span>
          </p>
        </div>
        <p className="font-display text-lg font-bold text-fog tabular-nums">
          {memberCards.length}
        </p>
      </div>

      <div className="relative">
        <div
          ref={scrollerRef}
          data-carousel-track="1"
          className="member-track"
        >
          {memberCards.map((m, i) => (
            <article
              key={m.slug}
              data-member-card={m.slug}
              data-roster-tile={m.slug}
              className="member-card"
            >
              <figure
                className="member-art maple-frame"
                style={{ backgroundImage: `url(${m.thumb})` }}
              >
                <img
                  src={m.art}
                  alt=""
                  width={720}
                  height={960}
                  sizes="(max-width: 640px) 78vw, 22rem"
                  data-avatar="portrait"
                  loading={i < 3 ? "eager" : "lazy"}
                  decoding="async"
                  fetchPriority={i === 0 ? "high" : "auto"}
                  className="member-art-img"
                  draggable={false}
                  onError={(e) => {
                    e.currentTarget.style.opacity = "0";
                  }}
                />
              </figure>
              <div className="member-meta">
                <p className="font-cjk text-lg font-bold text-fog" lang="zh-Hant">
                  {m.name}
                </p>
                <p className="mt-0.5 font-cjk text-xs text-amber" lang="zh-Hant">
                  {m.roleZh}
                  <span className="ml-1.5 font-display text-mist" lang="en">
                    {m.roleEn}
                  </span>
                </p>
                <p
                  className="mt-3 font-cjk text-base leading-snug text-fog"
                  lang="zh-Hant"
                  data-caption-zh={m.slug}
                >
                  {m.captionZh}
                </p>
                <p
                  className="mt-1 font-display text-sm text-mist"
                  lang="en"
                  data-caption-en={m.slug}
                >
                  {m.captionEn}
                </p>
              </div>
            </article>
          ))}
        </div>

        <div className="pointer-events-none absolute inset-y-0 flex w-full items-center justify-between px-2 sm:px-3">
          <button
            type="button"
            className="pointer-events-auto grid size-11 place-items-center rounded-pill bg-void/80 text-fog shadow-[0_0_0_1px_rgb(255_255_255_/_0.12)] disabled:opacity-30"
            onClick={() => go(index - 1)}
            disabled={index === 0}
            aria-label={`${copy.prevZh} ${copy.prevEn}`}
          >
            <ChevronLeft className="size-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="pointer-events-auto grid size-11 place-items-center rounded-pill bg-void/80 text-fog shadow-[0_0_0_1px_rgb(255_255_255_/_0.12)] disabled:opacity-30"
            onClick={() => go(index + 1)}
            disabled={index === memberCards.length - 1}
            aria-label={`${copy.nextZh} ${copy.nextEn}`}
          >
            <ChevronRight className="size-5" aria-hidden="true" />
          </button>
        </div>
      </div>

      <p className="px-5 pt-3 font-display text-xs text-mist tabular-nums sm:px-8">
        {index + 1} / {memberCards.length}
        <span className="ml-2 font-cjk" lang="zh-Hant">
          {current.name}
        </span>
      </p>

      <div
        data-member-rail="1"
        className="member-rail mt-3 px-5 pb-2 sm:px-8"
      >
        {memberCards.map((m, i) => (
          <button
            key={m.slug}
            type="button"
            data-rail-dot={m.slug}
            onClick={() => go(i)}
            className={`member-rail-btn ${i === index ? "is-on" : ""}`}
            aria-label={m.name}
            aria-current={i === index}
          >
            <img
              src={m.thumb}
              alt=""
              width={240}
              height={320}
              loading="lazy"
              decoding="async"
              className="member-rail-img"
              draggable={false}
            />
          </button>
        ))}
      </div>

      <div className="flex flex-col items-start justify-between gap-3 px-5 py-5 sm:flex-row sm:items-center sm:px-8">
        <p className="font-cjk text-sm text-mist" lang="zh-Hant">
          {copy.ctaZh}
          <span className="ml-2 font-display" lang="en">
            {copy.ctaEn}
          </span>
        </p>
        <button
          type="button"
          onClick={onJoin}
          className="inline-flex h-11 min-w-36 flex-col items-center justify-center rounded-pill bg-ember px-6 text-void transition-[transform,background-color] duration-150 ease-out hover:bg-amber active:scale-[0.96]"
        >
          <span className="font-cjk text-sm font-bold" lang="zh-Hant">
            {copy.joinZh}
          </span>
        </button>
      </div>
    </section>
  );
}
