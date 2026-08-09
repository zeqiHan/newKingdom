import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["@libsql/client", "libsql", "openai"],
};

export default nextConfig;
