import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
} from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import appCss from "../styles.css?url";

const APP_NAME = "NumbahWan";
const host = import.meta.env.VITE_PUBLIC_HOSTNAME;
const ogImage = host
  ? `https://${host}/og.jpg`
  : undefined;

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content:
          "width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=5",
      },
      { title: "NumbahWan — 楓之谷：閒置英雄公會" },
      {
        name: "description",
        content:
          "NumbahWan。楓之谷：閒置英雄。自由加入。No.1 中央大會 12月24日。",
      },
      { name: "apple-mobile-web-app-title", content: APP_NAME },
      { name: "theme-color", content: "#07080c" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:title", content: "NumbahWan" },
      {
        property: "og:description",
        content: "MapleStory Idle guild. Join Freely. 自由加入。",
      },
      { property: "og:type", content: "website" },
      { property: "og:locale", content: "zh_Hant" },
      ...(ogImage
        ? [
            { property: "og:image", content: ogImage },
            { property: "og:image:width", content: "1200" },
            { property: "og:image:height", content: "630" },
          ]
        : []),
    ],
    links: [
      { rel: "icon", type: "image/png", href: "/brand/n-pixel.png" },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/__grok/icon-180.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;500;600;700;800&family=Noto+Sans+TC:wght@400;500;700;900&display=swap",
      },
      { rel: "preload", as: "image", href: "/film/stills/void.jpg" },
      {
        rel: "preload",
        as: "image",
        href: "/brand/portraits/reggina.jpg?v=3",
      },
      {
        rel: "preload",
        as: "image",
        href: "/brand/portraits/gege.jpg?v=3",
      },
    ],
  }),
  component: () => (
    <html lang="zh-Hant" className="antialiased" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="bg-void text-fog">
        <PreviewHostBridge />
        <AuthProvider>
          <Outlet />
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  ),
});
