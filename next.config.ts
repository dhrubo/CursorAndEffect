import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [{ source: "/plan", destination: "/money-health", permanent: false }];
  },
};

export default nextConfig;
