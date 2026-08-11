import type { NextConfig } from "next";
import { withEve } from "eve/next";
import { createMDX } from "fumadocs-mdx/next";

const withMDX = createMDX();

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  serverExternalPackages: ["pg", "pg-native"],
  experimental: {
    // TypeScript 7 (tsgo) does not expose the compiler API Next drives directly,
    // so build-time checking has to go through the TypeScript CLI instead.
    useTypeScriptCli: true,
    // Enables next/navigation forbidden() / unauthorized() → app/forbidden.tsx / unauthorized.tsx
    authInterrupts: true,
  },
};

// MDX first, then eve proxy — keep /eve/v1/* behavior outermost.
export default withEve(withMDX(nextConfig));
