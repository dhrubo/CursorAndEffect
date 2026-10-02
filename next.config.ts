import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The dev server is bound on 0.0.0.0 so it is reachable, and the browser
  // still requests it as 127.0.0.1 or localhost. Next blocks those unless listed.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  async redirects() {
    return [{ source: "/plan", destination: "/money-health", permanent: false }];
  },
};

export default nextConfig;
