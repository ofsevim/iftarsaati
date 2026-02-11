import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import legacy from "@vitejs/plugin-legacy";
import path from "path";

export default defineConfig({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    legacy({
      // Eski Android Chrome / iOS Safari için ek uyumluluk
      targets: ["defaults", "Chrome >= 49", "Safari >= 10", "iOS >= 10"],
      modernPolyfills: true,
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
