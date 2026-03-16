import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    reactCompiler: true,
  },
  transpilePackages: ["@travyl/shared"],
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "y-supabase": path.resolve(__dirname, "../../node_modules/y-supabase/dist/index.js"),
    };
    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default nextConfig;
