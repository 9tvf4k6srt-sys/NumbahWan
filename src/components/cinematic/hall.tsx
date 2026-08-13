import { copy } from "@/lib/copy";
import { guild } from "@/lib/guild";
import { VitalBars } from "./bars";
import { Emblem } from "./emblem";
import { HouseWall } from "./house-wall";

type HallProps = {
  onJoin: () => void;
};

export function Hall({ onJoin }: HallProps) {
  const xp = Math.round((guild.xp / guild.xpMax) * 100);
  return (
    <section
      id="join"
      className="relative z-30 bg-void pt-10 pb-16 sm:pt-14 sm:pb-20"
    >
      <div className="mx-auto max-w-5xl px-5 sm:px-10">
        <div className="flex flex-col items-start gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="font-cjk text-sm text-amber" lang="zh-Hant">
              {copy.guildZh}
              <span className="ml-2 font-display text-mist" lang="en">
                {copy.guildEn}
              </span>
            </p>
            <h2 className="mt-3 font-display text-4xl leading-none font-extrabold tracking-tight text-fog sm:text-6xl">
              {guild.name}
            </h2>
            <p className="mt-3 max-w-lg font-cjk text-base text-mist" lang="zh-Hant">
              {guild.noticeZh}
            </p>
            <p className="mt-1 font-display text-sm text-mist" lang="en">
              {guild.noticeEn} · {guild.gameEn}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Emblem className="size-16 sm:size-[72px]" glow />
            <div>
              <p className="font-cjk text-sm text-mist" lang="zh-Hant">
                {copy.guildZh} Lv {guild.level}
              </p>
              <p className="font-display text-2xl font-bold text-fog tabular-nums">
                {guild.members}
                <span className="text-mist">/{guild.capacity}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            [copy.masterZh, copy.masterEn, guild.master],
            [copy.avgZh, copy.avgEn, `Lv ${guild.averageLevel}`],
            [copy.conquestZh, copy.conquestEn, `#${guild.conquestRank}`],
            [copy.joinWayZh, copy.joinWayEn, copy.joinZh],
          ].map(([zh, en, v]) => (
            <div
              key={zh}
              className="rounded-2xl bg-ink px-4 py-4 shadow-[0_0_0_1px_rgb(255_255_255_/_0.08)]"
            >
              <p className="font-cjk text-xs text-mist" lang="zh-Hant">
                {zh}
                <span className="ml-1.5 font-display" lang="en">
                  {en}
                </span>
              </p>
              <p className="mt-1 font-display text-lg font-bold text-fog tabular-nums">
                {v}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between text-mist">
            <span className="font-cjk text-xs" lang="zh-Hant">
              {copy.xpZh}
              <span className="ml-1.5 font-display" lang="en">
                {copy.xpEn}
              </span>
            </span>
            <span className="font-display text-xs tabular-nums">
              {guild.xp.toLocaleString()} / {guild.xpMax.toLocaleString()}
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-pill bg-fog/10">
            <div
              className="h-full rounded-pill bg-gradient-to-r from-cyan to-ember"
              style={{ width: `${xp}%` }}
            />
          </div>
        </div>

        <div className="mt-5 max-w-md">
          <VitalBars
            hp={guild.xp}
            hpMax={guild.xpMax}
            mp={guild.members}
            mpMax={guild.capacity}
          />
        </div>

        <div className="mt-12 flex flex-col items-start gap-5 rounded-3xl bg-ink px-6 py-8 shadow-[0_0_0_1px_rgb(255_255_255_/_0.08)] sm:flex-row sm:items-center sm:justify-between sm:px-10">
          <div>
            <p className="font-cjk text-2xl text-fog" lang="zh-Hant">
              {copy.ctaZh}
            </p>
            <p className="mt-1 font-display text-sm text-mist" lang="en">
              {copy.ctaEn}
            </p>
          </div>
          <button
            type="button"
            onClick={onJoin}
            className="inline-flex h-12 min-w-44 flex-col items-center justify-center rounded-pill bg-ember px-8 text-void transition-[transform,background-color] duration-150 ease-out hover:bg-amber active:scale-[0.96]"
          >
            <span className="font-cjk text-sm font-bold" lang="zh-Hant">
              {copy.joinZh}
            </span>
            <span className="font-display text-xs font-semibold" lang="en">
              {copy.joinEn}
            </span>
          </button>
        </div>
      </div>

      <div className="mx-auto mt-2 max-w-5xl">
        <HouseWall onJoin={onJoin} />
      </div>

      <p className="mt-10 text-center font-cjk text-xs text-mist" lang="zh-Hant">
        {copy.gameZh}
        <span className="mx-2">·</span>
        {copy.masterZh} {guild.master}
      </p>
    </section>
  );
}
