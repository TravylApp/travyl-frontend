import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
transpilePackages: ["@travyl/shared"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "i.pravatar.cc",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "source.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "d3dqioy2sca31t.cloudfront.net",
      },
      {
        protocol: "https",
        hostname: "serpapi.com",
      },
    ],
  },
};

export default nextConfig;
