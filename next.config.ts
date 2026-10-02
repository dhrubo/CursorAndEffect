import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The dev server is bound on 0.0.0.0 so it is reachable, and the browser
  // still requests it as 127.0.0.1. Next blocks that unless it is listed.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
};

export default nextConfig;
