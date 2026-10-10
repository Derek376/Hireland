import type { NextConfig } from "next";

const config: NextConfig = {
  poweredByHeader: false,
  agentRules: false,
  serverExternalPackages: ["pdf-parse", "mammoth"],
  experimental: { serverActions: { bodySizeLimit: "6mb" } },
};
export default config;
