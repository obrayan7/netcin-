import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../");

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@netcine/db"],
  outputFileTracingRoot: root,
  experimental: {
    serverActions: { bodySizeLimit: "2mb" },
  },
  // L'admin ne doit jamais être indexé
  async headers() {
    return [{ source: "/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] }];
  },
};

export default nextConfig;
