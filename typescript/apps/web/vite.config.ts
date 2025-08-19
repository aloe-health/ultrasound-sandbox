/* Author: Nathaniel <nathaniel@aloe-health.tech>
 * Created: 2025-08-18
 * Purpose: Vite configuration for the React web application.
 */

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@aloe/core": path.resolve(__dirname, "../../packages/core/src/index.ts"),
      "@aloe/adapters-web": path.resolve(__dirname, "../../packages/adapters/web/src/index.ts"),
      "@": path.resolve(__dirname, "./src")
    }
  }
});
