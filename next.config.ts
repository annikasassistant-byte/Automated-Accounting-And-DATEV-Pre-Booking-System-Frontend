import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Keep tracing inside this app; avoid parent-directory lockfile confusion.
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
