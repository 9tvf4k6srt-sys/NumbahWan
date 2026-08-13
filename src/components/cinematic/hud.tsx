import { ACTS, activeAct } from "@/lib/film";
import { copy } from "@/lib/copy";
import { guild } from "@/lib/guild";
import { Emblem } from "./emblem";

type HudProps = {
  progress: number;
  onJoin: () => void;
  veil?: number;
};

export function Hud({ progress, onJoin, veil = 0 }: HudProps) {
  const act = activeAct(progress);
  const meta = ACTS[act - 1];
  const chrome = 1 - Math.min(1, veil * 1.15);
  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-40">
      <div className="flex items-center justify-between px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 sm:px-7">
        <a
          href="#top"
          className="pointer-events-auto flex items-center gap-2.5 rounded-pill pr-3"
        >
          <Emblem className="size-8 sm:size-9" glow />
          <span className="font-display text-sm font-bold text-fog">
            {guild.name}
          </span>
        </a>
        <div className="pointer-events-auto flex items-center gap-2">
          <a
            href="/login"
            className="hidden min-h-11 items-center px-3 font-cjk text-sm text-mist sm:inline-flex"
          >
            {copy.signInZh}
          </a>
          <button
            type="button"
            onClick={onJoin}
            className="inline-flex min-h-11 min-w-11 flex-col items-center justify-center rounded-pill bg-ember px-5 text-void shadow-[0_0_24px_rgb(255_106_0_/_0.35)] transition-[transform,background-color] duration-150 ease-out hover:bg-amber active:scale-[0.96]"
          >
            <span className="font-cjk text-sm font-bold" lang="zh-Hant">
              {copy.joinShortZh}
            </span>
          </button>
        </div>
      </div>

      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(0.9rem,env(safe-area-inset-bottom))] sm:px-7"
        style={{ opacity: chrome }}
      >
        <div className="mx-auto flex max-w-5xl items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="font-cjk text-xs text-mist" lang="zh-Hant">
              {act} · {meta?.zh}
              <span className="ml-1.5 font-display" lang="en">
                {meta?.en}
              </span>
            </p>
            <div className="mt-2 h-[2px] w-40 overflow-hidden bg-fog/15 sm:w-56">
              <div
                className="h-full origin-left bg-ember"
                style={{ transform: `scaleX(${Math.max(0.02, progress)})` }}
              />
            </div>
          </div>
          <p className="hidden font-cjk text-sm text-mist sm:block" lang="zh-Hant">
            {copy.scrollZh}
            <span className="ml-2 font-display" lang="en">
              {copy.scrollEn}
            </span>
          </p>
        </div>
      </div>
    </header>
  );
}
