import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The dev server only accepts the hostname it bound, which is localhost.
  // 127.0.0.1 is a different origin and otherwise drops the client bundle.
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
