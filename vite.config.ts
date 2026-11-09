// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
// @cloudflare/vite-plugin builds from this — wrangler.jsonc main alone is insufficient.
export default (env: { mode: string; command: "build" | "serve" }) =>
  defineConfig({
    tanstackStart: {
      server: { entry: "server" },
      ...(env.mode === "android"
        ? {
            spa: {
              enabled: true,
              prerender: { outputPath: "/index.html" },
            },
          }
        : {}),
    },
    vite: {
      server: {
        proxy: {
          "/api/predict": {
            target: process.env.FLASK_BACKEND_URL || "http://127.0.0.1:5000",
            changeOrigin: true,
            rewrite: (path: string) => path.replace(/^\/api/, ""),
          },
        },
      },
      plugins: [
        {
          name: "rolldown-to-rollup-shim",
          enforce: "post",
          config(config: Record<string, unknown>) {
            const envs = config.environments as
              | Record<string, { build?: { rolldownOptions?: unknown; rollupOptions?: unknown } }>
              | undefined;
            if (envs) {
              for (const envName of Object.keys(envs)) {
                const envConf = envs[envName];
                if (envConf?.build?.rolldownOptions && !envConf.build.rollupOptions) {
                  envConf.build.rollupOptions = envConf.build.rolldownOptions;
                }
              }
            }
          },
          configEnvironment(
            name: string,
            config: { build?: { rolldownOptions?: unknown; rollupOptions?: unknown } },
          ) {
            if (config.build?.rolldownOptions && !config.build.rollupOptions) {
              config.build.rollupOptions = config.build.rolldownOptions;
            }
          },
        },
      ],
    },
  })(env);
