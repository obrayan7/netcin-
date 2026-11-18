import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../");

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@netcine/db"],
  outputFileTracingRoot: root,
};

export default nextConfig;
