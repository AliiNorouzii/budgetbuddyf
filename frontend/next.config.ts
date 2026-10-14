import type { NextConfig } from "next";

const API_URL = process.env.API_URL ?? "http://localhost:4000";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // The browser only talks to this origin; /api/* is proxied to the NestJS
  // backend so the session cookie stays first-party.
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${API_URL}/:path*` }];
  },
};

export default nextConfig;
