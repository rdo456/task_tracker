/// <reference types="vitest" />
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, "../..", "");
  return {
    plugins: [react()],
    server: {
      port: Number(env.WEB_PORT) || 5173,
      proxy: {
        "/api": env.API_URL || "http://localhost:3000",
      },
    },
    test: {
      environment: "jsdom",
      setupFiles: ["./src/test/setup.ts"],
    },
  };
});
