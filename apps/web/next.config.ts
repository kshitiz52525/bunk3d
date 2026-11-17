import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@bunk3d/ui", "@bunk3d/api", "@bunk3d/core"],
};

export default nextConfig;
