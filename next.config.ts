import type { NextConfig } from "next";
import nextPwa from "next-pwa";

const runtimeCaching = [
  // Cache images
  {
    urlPattern: ({ request }: { request: Request }) =>
      request.destination === "image",
    handler: "CacheFirst" as const,
    options: {
      cacheName: "images",
      expiration: {
        maxEntries: 100,
        maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
      },
      cacheableResponse: {
        statuses: [0, 200],
      },
    },
  },
  // Cache stylesheets and fonts
  {
    urlPattern: ({ request }: { request: Request }) =>
      ["style", "font"].includes(request.destination),
    handler: "CacheFirst" as const,
    options: {
      cacheName: "static-assets",
      expiration: {
        maxEntries: 100,
        maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
      },
      cacheableResponse: {
        statuses: [0, 200],
      },
    },
  },
  // Cache scripts
  {
    urlPattern: ({ request }: { request: Request }) =>
      request.destination === "script",
    handler: "StaleWhileRevalidate" as const,
    options: {
      cacheName: "scripts",
      expiration: {
        maxEntries: 50,
        maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
      },
      cacheableResponse: {
        statuses: [0, 200],
      },
    },
  },
  // Cache navigation requests (HTML pages)
  {
    urlPattern: ({ request }: { request: Request }) =>
      request.mode === "navigate",
    handler: "NetworkFirst" as const,
    options: {
      cacheName: "pages",
      expiration: {
        maxEntries: 50,
        maxAgeSeconds: 60 * 60 * 24, // 1 day
      },
      cacheableResponse: {
        statuses: [0, 200],
      },
    },
  },
];

const withPwa = nextPwa({
  dest: "public",
  disable: false, // Enable PWA in all environments
  register: true,
  skipWaiting: true,
  runtimeCaching,
  buildExcludes: ["app-build-manifest.json"],
  publicExcludes: ["!icons/**/*"],
  fallbacks: {
    document: "/", // Fallback page for offline navigation
  },
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
};

export default withPwa(nextConfig);
