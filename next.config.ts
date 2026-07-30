import type { NextConfig } from "next";
import { withEve } from "eve/next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  experimental: {
    // TypeScript 7 (tsgo) does not expose the compiler API Next drives directly,
    // so build-time checking has to go through the TypeScript CLI instead.
    useTypeScriptCli: true,
  },
};

export default withEve(nextConfig);
