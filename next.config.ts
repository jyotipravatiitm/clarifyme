import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Self-contained server bundle for the Docker image (see Dockerfile).
  output: "standalone",
  // SQL migrations are read at boot by src/instrumentation.ts.
  outputFileTracingIncludes: { "/*": ["./drizzle/**/*"] },
};

export default nextConfig;
