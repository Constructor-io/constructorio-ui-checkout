import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

// One .env at the example root serves both the server and the client.
const envDir = "..";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, envDir, "");
  const apiTarget = `http://localhost:${env.PORT}`;

  return {
    envDir,
    plugins: [react()],
    resolve: {
      // The library is linked from the repo root, which has its own React.
      dedupe: ["react", "react-dom"],
    },
    server: {
      port: Number(env.CLIENT_PORT),
      strictPort: true,
      proxy: {
        "/api": { target: apiTarget, changeOrigin: true },
        "/webhook": { target: apiTarget, changeOrigin: true },
      },
    },
  };
});
