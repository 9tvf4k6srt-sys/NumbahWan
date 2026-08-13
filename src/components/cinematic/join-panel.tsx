import { useState, type FormEvent } from "react";
import { classes, copy } from "@/lib/copy";
import { guild } from "@/lib/guild";
import { submitJoin } from "@/lib/join";
import { Emblem } from "./emblem";

type JoinPanelProps = {
  open: boolean;
  onClose: () => void;
};

export function JoinPanel({ open, onClose }: JoinPanelProps) {
  const [ign, setIgn] = useState("");
  const [cls, setCls] = useState<string>(classes[0].id);
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "err">(
    "idle",
  );
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setError("");
    try {
      await submitJoin({ data: { ign, cls, note } });
      setStatus("done");
    } catch (err) {
      setStatus("err");
      setError(err instanceof Error ? err.message : copy.errZh);
    }
  }

  return (
    <div
      className={
        open
          ? "pointer-events-auto fixed inset-0 z-50"
          : "pointer-events-none fixed inset-0 z-50"
      }
      aria-hidden={!open}
    >
      <button
        type="button"
        aria-label={copy.closeZh}
        onClick={onClose}
        className="absolute inset-0 bg-void/80 backdrop-blur-md transition-opacity duration-200 ease-out"
        style={{ opacity: open ? 1 : 0 }}
      />
      <aside
        className={`absolute inset-x-0 bottom-0 max-h-[92dvh] overflow-y-auto rounded-t-3xl bg-ink px-5 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-[0_-20px_80px_rgb(0_0_0_/_0.55)] transition-[transform,opacity] duration-300 ease-out sm:inset-x-auto sm:left-1/2 sm:w-[28rem] sm:max-h-[min(88dvh,720px)] sm:-translate-x-1/2 ${
          open
            ? "translate-y-0 opacity-100"
            : "pointer-events-none translate-y-[110%] opacity-0"
        }`}
        role="dialog"
        aria-labelledby="join-title"
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-pill bg-fog/20 sm:hidden" />
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <Emblem className="size-9" glow />
            <div>
              <p className="font-cjk text-xs text-amber" lang="zh-Hant">
                {copy.joinZh}
              </p>
              <h2
                id="join-title"
                className="font-cjk text-2xl font-extrabold text-fog"
                lang="zh-Hant"
              >
                {copy.applyZh}
              </h2>
              <p className="font-display text-xs text-mist" lang="en">
                {copy.applyEn}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-11 place-items-center rounded-pill text-mist hover:text-fog"
            aria-label={copy.closeZh}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
              <path
                d="M3 3l10 10M13 3L3 13"
                stroke="currentColor"
                strokeWidth="1.6"
              />
            </svg>
          </button>
        </div>
        <p className="mt-3 font-cjk text-[15px] leading-relaxed text-mist" lang="zh-Hant">
          {copy.ctaZh}
        </p>
        <p className="mt-0.5 font-display text-sm text-mist" lang="en">
          {copy.ctaEn} {copy.masterEn} {guild.master}.
        </p>

        {status === "done" ? (
          <div className="mt-8 rounded-2xl bg-void/70 px-5 py-8 text-center">
            <p className="font-cjk text-xl font-bold text-amber" lang="zh-Hant">
              {copy.doneZh}
            </p>
            <p className="mt-2 font-display text-sm text-mist" lang="en">
              {copy.doneEn}
            </p>
          </div>
        ) : open ? (
          <form className="mt-6 space-y-4" onSubmit={onSubmit} autoComplete="off">
            <label className="block">
              <span className="font-cjk text-xs text-mist" lang="zh-Hant">
                {copy.ignZh}
                <span className="ml-1.5 font-display" lang="en">
                  {copy.ignEn}
                </span>
              </span>
              <input
                required
                minLength={2}
                maxLength={24}
                value={ign}
                onChange={(e) => setIgn(e.target.value)}
                placeholder="IGN"
                autoComplete="off"
                suppressHydrationWarning
                className="mt-1.5 h-12 w-full rounded-xl bg-void px-4 font-display text-base text-fog outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-ember"
              />
            </label>
            <label className="block">
              <span className="font-cjk text-xs text-mist" lang="zh-Hant">
                {copy.classZh}
                <span className="ml-1.5 font-display" lang="en">
                  {copy.classEn}
                </span>
              </span>
              <select
                value={cls}
                onChange={(e) => setCls(e.target.value)}
                className="mt-1.5 h-12 w-full rounded-xl bg-void px-4 font-cjk text-base text-fog outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-ember"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.zh} / {c.en}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="font-cjk text-xs text-mist" lang="zh-Hant">
                {copy.noteZh}
                <span className="ml-1.5 font-display" lang="en">
                  {copy.noteEn} · {copy.optionalEn}
                </span>
              </span>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                maxLength={280}
                placeholder={copy.optionalZh}
                className="mt-1.5 w-full resize-none rounded-xl bg-void px-4 py-3 font-cjk text-base text-fog outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-ember"
              />
            </label>
            {error ? <p className="text-sm text-amber">{error}</p> : null}
            <button
              type="submit"
              disabled={status === "sending"}
              className="flex h-12 w-full flex-col items-center justify-center rounded-pill bg-ember text-void transition-[transform,background-color] duration-150 ease-out hover:bg-amber active:scale-[0.96] disabled:opacity-60"
            >
              <span className="font-cjk text-sm font-bold" lang="zh-Hant">
                {status === "sending" ? copy.sendingZh : copy.sendZh}
              </span>
              <span className="font-display text-[10px] font-semibold" lang="en">
                {status === "sending" ? copy.sendingEn : copy.sendEn}
              </span>
            </button>
          </form>
        ) : null}
      </aside>
    </div>
  );
}
