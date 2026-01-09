import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export for Electron packaging
  output: 'export',

  // Disable image optimization for static export
  images: {
    unoptimized: true,
  },

  // Trailing slash for proper file paths in Electron
  trailingSlash: true,
};

export default nextConfig;
