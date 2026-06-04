import type { Metadata } from "next";
import type { Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import { ServiceWorkerRegistrar } from "@/components/ServiceWorkerRegistrar";

export const metadata: Metadata = {
  title: "Safe Share | Private Redaction Workspace",
  description:
    "Scan files, redact sensitive data, and deliver controlled share links from a polished private workspace.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Safe Share",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#15956f" },
    { media: "(prefers-color-scheme: dark)", color: "#07111f" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const devServiceWorkerCleanup =
    process.env.NODE_ENV !== "production"
      ? `
        (function () {
          try {
            if (!("serviceWorker" in navigator)) return;

            var cleanupKey = "safe-share-dev-sw-cleaned";
            var cleanup = function () {
              return navigator.serviceWorker.getRegistrations()
                .then(function (registrations) {
                  return Promise.all(registrations.map(function (registration) {
                    return registration.unregister();
                  }));
                })
                .then(function () {
                  if (!("caches" in window)) return;
                  return caches.keys().then(function (cacheNames) {
                    return Promise.all(cacheNames.filter(function (cacheName) {
                      return cacheName.indexOf("safe-share-") === 0;
                    }).map(function (cacheName) {
                      return caches.delete(cacheName);
                    }));
                  });
                });
            };

            if (navigator.serviceWorker.controller && !sessionStorage.getItem(cleanupKey)) {
              sessionStorage.setItem(cleanupKey, "1");
              cleanup().finally(function () {
                window.location.reload();
              });
              return;
            }

            cleanup();
          } catch (error) {}
        })();
      `
      : "";

  return (
    <html lang="en" className="min-h-screen antialiased" suppressHydrationWarning>
      <body className="min-h-screen flex flex-col bg-[color:var(--background)] text-[color:var(--foreground)]">
        {devServiceWorkerCleanup && (
          <Script
            id="dev-service-worker-cleanup"
            strategy="beforeInteractive"
            dangerouslySetInnerHTML={{
              __html: devServiceWorkerCleanup,
            }}
          />
        )}
        <Script
          id="theme-bootstrap"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                try {
                  var saved = localStorage.getItem("theme-mode");
                  var theme = saved || (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
                  document.documentElement.dataset.theme = theme;
                } catch (e) {}
              })();
            `,
          }}
        />
        <ServiceWorkerRegistrar />
        {children}
      </body>
    </html>
  );
}
