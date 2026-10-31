// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { browserEnvFor, resolveHostEnv } from "./src/lib/host-env";

// Vercel builds use the backend connected in Vercel's settings (not the Lovable .env),
// so browser and server always talk to the same database. A build with missing
// settings stops here, which keeps the previous working deployment live.
const onVercel = !!process.env.VERCEL;
if (onVercel) {
  const hostEnv = resolveHostEnv(process.env);
  if (hostEnv.missing.length) {
    throw new Error(
      `Vercel build stopped: add ${hostEnv.missing.join(", ")} in Vercel → Project → Settings → Environment Variables, then redeploy.`,
    );
  }
  Object.assign(process.env, browserEnvFor(hostEnv));
}

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  ...(onVercel ? { nitro: { preset: "vercel" } } : {}),
});
