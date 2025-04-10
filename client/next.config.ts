import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  transpilePackages: ['three'],
  experimental: {
    allowedDevOrigins: [
      'http://ec2-13-125-170-246.ap-northeast-2.compute.amazonaws.com:3001',
      'https://ec2-13-125-170-246.ap-northeast-2.compute.amazonaws.com:3001',
    ],
  },
};

export default nextConfig;
