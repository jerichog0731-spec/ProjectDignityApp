import path from "node:path";
import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  reloadOnOnline: true,
  workboxOptions: {
    skipWaiting: false,
    clientsClaim: false,
  },
});

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(process.cwd()),
};

export default withPWA(nextConfig);
