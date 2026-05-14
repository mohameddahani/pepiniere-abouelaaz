import type { NextConfig } from "next";
import nextPwa from "next-pwa";

const runtimeCaching = [
  {
    urlPattern: ({ request }: { request: Request }) =>
      ["style", "script", "image", "font"].includes(request.destination),
    handler: "CacheFirst" as const,
    options: {
      cacheName: "static-assets",
      expiration: {
        maxEntries: 200,
        maxAgeSeconds: 30 * 24 * 60 * 60,
      },
      cacheableResponse: {
        statuses: [0, 200],
      },
    },
  },
  {
    urlPattern: ({ request }: { request: Request }) =>
      request.mode === "navigate",
    handler: "StaleWhileRevalidate" as const,
    options: {
      cacheName: "pages",
      expiration: {
        maxEntries: 50,
        maxAgeSeconds: 7 * 24 * 60 * 60,
      },
      cacheableResponse: {
        statuses: [0, 200],
      },
    },
  },
];

const withPwa = nextPwa({
  dest: "public",
  disable: process.env.NODE_ENV !== "production",
  register: true,
  skipWaiting: true,
  runtimeCaching,
});

const nextConfig: NextConfig = {};

export default withPwa(nextConfig);
