import { copy } from "@/lib/copy";
import { Emblem } from "./emblem";

export function Loader({ progress }: { progress: number }) {
  const pct = Math.round(progress * 100);
  return (
    <div
      data-loader="1"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-void px-8 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))]"
    >
      <div className="grain" />
      <div className="vignette" />
      <div className="relative flex w-full max-w-xs flex-col items-center">
        <div className="loader-mark-well">
          <Emblem className="loader-mark" glow />
        </div>
        <p className="mt-5 font-display text-sm font-bold tracking-wide text-amber uppercase">
          {copy.brand}
        </p>
        <p className="mt-2 font-cjk text-sm text-mist" lang="zh-Hant">
          {copy.loaderZh}
          <span className="ml-2 font-display" lang="en">
            {copy.loaderEn}
          </span>
        </p>
        <div className="mt-7 h-[2px] w-36 overflow-hidden bg-fog/15 sm:w-44">
          <div
            className="h-full bg-ember transition-[transform] duration-200 ease-out"
            style={{
              transform: `scaleX(${Math.max(0.04, progress)})`,
              transformOrigin: "left center",
            }}
          />
        </div>
        <p className="mt-3 font-display text-xs tracking-wide text-mist tabular-nums">
          {pct}%
        </p>
      </div>
    </div>
  );
}
