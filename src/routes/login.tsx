import { createFileRoute, Link } from "@tanstack/react-router";
import { GROK_PROVIDERS, authEnabled, signIn } from "@/lib/auth/client";
import { Emblem } from "@/components/cinematic/emblem";
import { copy } from "@/lib/copy";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden bg-void px-6 text-fog">
      <img
        src="/film/stills/n-hero.jpg"
        alt=""
        className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-40"
      />
      <div className="grain" />
      <div className="vignette" />
      <div className="relative w-full max-w-sm">
        <Link to="/" className="mb-8 flex items-center gap-2">
          <Emblem className="size-8" glow />
          <span className="font-display text-sm font-bold">{copy.brand}</span>
        </Link>
        <h1 className="font-cjk text-3xl font-extrabold tracking-tight" lang="zh-Hant">
          {copy.signInZh}
        </h1>
        <p className="mt-1 font-display text-sm text-mist" lang="en">
          {copy.signInEn}
        </p>
        <p className="mt-3 font-cjk text-mist" lang="zh-Hant">
          {copy.loginLeadZh}
        </p>
        <p className="mt-0.5 font-display text-sm text-mist" lang="en">
          {copy.loginEn}
        </p>
        <div className="mt-8 space-y-3">
          {authEnabled ? (
            GROK_PROVIDERS.map((p) => (
              <button
                key={p.providerId}
                type="button"
                onClick={() => signIn(p.providerId, { callbackURL: "/" })}
                className="flex h-12 w-full items-center justify-center rounded-pill bg-fog font-cjk text-sm font-bold text-void transition-[transform,background-color] duration-150 ease-out hover:bg-amber active:scale-[0.96]"
              >
                {copy.continueZh} {p.label}
              </button>
            ))
          ) : (
            <p className="font-cjk text-sm text-mist" lang="zh-Hant">
              {copy.disabledZh}
              <span className="ml-2 font-display" lang="en">
                {copy.disabledEn}
              </span>
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
