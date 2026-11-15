import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    // TODO: daftarkan host foto hasil scraping (mis. CDN situs iklan kos) di sini,
    // contoh: { protocol: "https", hostname: "static.example.com", pathname: "/**" }
    remotePatterns: [],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
