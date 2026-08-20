import path from "node:path"
import { fileURLToPath } from "node:url"

import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  output: "standalone",
  // Keep Turbopack inside this package if a parent directory has a lockfile.
  turbopack: {
    root: path.dirname(fileURLToPath(import.meta.url)),
  },
}

export default nextConfig
