import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/resumes/upload-pdf": [
      "./node_modules/@napi-rs/canvas/**/*",
      "./node_modules/@napi-rs/canvas-linux-x64-gnu/**/*",
    ],
  },
  serverExternalPackages: ["@napi-rs/canvas"],
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
