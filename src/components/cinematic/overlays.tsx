import { CUES, cueOpacity, easeIn, easeOut } from "@/lib/film";
import { copy } from "@/lib/copy";
import { guild } from "@/lib/guild";

function band(p: number, a: number, b: number, c: number, d: number): number {
  if (p <= a || p >= d) return 0;
  if (p < b) return easeOut((p - a) / (b - a));
  if (p > c) return 1 - easeIn((p - c) / (d - c));
  return 1;
}

export function Overlays({
  progress,
  veil,
}: {
  progress: number;
  veil: number;
}) {
  const hint = progress < 0.03 ? 1 - progress / 0.03 : 0;
  const stats = band(progress, 0.395, 0.42, 0.47, 0.505);
  const fade = 1 - veil;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-20"
      style={{ opacity: fade }}
      data-overlays="1"
    >
      {hint > 0.02 ? (
        <div
          className="absolute inset-x-0 bottom-[max(1.5rem,env(safe-area-inset-bottom))] flex flex-col items-center"
          style={{ opacity: hint }}
          data-cue-place="bottom"
        >
          <p className="font-cjk text-sm text-fog" lang="zh-Hant">
            {copy.scrollZh}
          </p>
          <p className="mt-0.5 font-display text-[11px] text-mist" lang="en">
            {copy.scrollEn}
          </p>
          <div className="mt-2 h-8 w-px origin-top bg-gradient-to-b from-amber to-transparent" />
        </div>
      ) : null}

      {CUES.map((cue) => {
        const o = cueOpacity(cue, progress);
        if (o <= 0.01) return null;
        const y = (1 - o) * 10;
        const align =
          cue.align === "center"
            ? "items-center text-center mx-auto"
            : cue.align === "right"
              ? "items-end text-right ml-auto"
              : "items-start text-left";
        return (
          <div
            key={cue.id}
            className={`absolute inset-x-0 top-[max(4.75rem,calc(env(safe-area-inset-top)+3.5rem))] flex px-6 sm:px-12 md:px-20 ${align}`}
            style={{
              opacity: o,
              transform: `translate3d(0, ${y}px, 0)`,
            }}
            data-cue={cue.id}
            data-cue-place="top"
          >
            <div className="max-w-3xl">
              <p className="mb-1 font-cjk text-[11px] text-amber sm:text-sm" lang="zh-Hant">
                {cue.kickerZh}
                <span className="ml-2 font-display text-mist" lang="en">
                  {cue.kickerEn}
                </span>
              </p>
              <h2
                className="font-cjk text-3xl leading-none font-black text-fog sm:text-5xl md:text-6xl"
                lang="zh-Hant"
              >
                {cue.zh}
              </h2>
              <p
                className="mt-2 font-display text-base text-mist sm:text-xl"
                lang="en"
              >
                {cue.en}
              </p>
            </div>
          </div>
        );
      })}

      {stats > 0.02 ? (
        <div
          className="absolute inset-x-0 bottom-[18%] px-6 sm:px-12"
          style={{ opacity: stats, transform: `translate3d(0, ${(1 - stats) * 16}px, 0)` }}
          data-cue-place="bottom"
        >
          <div className="mx-auto flex max-w-3xl justify-between gap-3 border-t border-line pt-4">
            {[
              [copy.avgZh, copy.avgEn, `Lv ${guild.averageLevel}`],
              [copy.guildZh, copy.guildEn, `${guild.members} / ${guild.capacity}`],
              [copy.conquestZh, copy.conquestEn, `#${guild.conquestRank}`],
            ].map(([zh, en, v]) => (
              <div key={zh}>
                <p className="font-cjk text-xs text-mist" lang="zh-Hant">
                  {zh}
                  <span className="ml-1.5 font-display" lang="en">
                    {en}
                  </span>
                </p>
                <p className="mt-1 font-display text-xl font-bold text-fog tabular-nums sm:text-3xl">
                  {v}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
