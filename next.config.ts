import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["xpian.exe.xyz"],
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts", "date-fns"],
  },
};

export default nextConfig;
