import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // content/instructions.md is read at runtime; make sure it ships with the server bundle.
  outputFileTracingIncludes: {
    "/*": ["./content/**/*"],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
