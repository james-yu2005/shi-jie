import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prevent webpack from trying to bundle the native NAPI module for jieba
  serverExternalPackages: ['@node-rs/jieba'],
};

export default nextConfig;
