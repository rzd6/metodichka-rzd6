import { bindings, defineConfig, defineWorker } from "cf/config";

export default defineConfig({
  worker: defineWorker({
    name: "metodichka-rzd6",
    entrypoint: "vinext/server/fetch-handler",
    compatibilityDate: "2026-10-31",
    compatibilityFlags: ["nodejs_compat"],
    assets: {
      htmlHandling: "none",
      notFoundHandling: "none",
      runWorkerFirst: ["/*", "!/_next/static/*", "!/*/_next/static/*"],
    },
    env: {
      ASSETS: bindings.assets(),
      IMAGES: bindings.images(),
      VINEXT_KV_CACHE: bindings.kv({ id: "2e137f8c4c4c48d084226f284bdab91a" }),

      // Public / non-sensitive
      NEXT_PUBLIC_APP_URL: bindings.text("https://metodichka-rzd6.egorsofronov120452.workers.dev"),
      NEXT_PUBLIC_SUPABASE_URL: bindings.text("https://dxefccrogyqhwvvzfdvf.supabase.co"),
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: bindings.text("sb_publishable_1nSni1LDgK7pxNhR9HKmqg_3C0-HnP8"),
      SUPABASE_URL: bindings.text("https://dxefccrogyqhwvvzfdvf.supabase.co"),
      SUPABASE_PUBLISHABLE_KEY: bindings.text("sb_publishable_1nSni1LDgK7pxNhR9HKmqg_3C0-HnP8"),
      POSTGRES_DATABASE: bindings.text("postgres"),
      POSTGRES_HOST: bindings.text("db.dxefccrogyqhwvvzfdvf.supabase.co"),
      POSTGRES_USER: bindings.text("postgres"),
      GOOGLE_SHEET_ID: bindings.text("1hJNbc8TuU9Plrv8_1Ho5xq8RpXkZ4peFC8_pREO__So"),
      GOOGLE_CLIENT_ID: bindings.text("549758084455-893qcp96f6q0vqkrb9k00o93cftn6kga.apps.googleusercontent.com"),

      // Secrets — значения хранятся в дашборде, здесь только объявление
      GOOGLE_CLIENT_SECRET: bindings.secret(),
      GOOGLE_REFRESH_TOKEN: bindings.secret(),
      GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: bindings.secret(),
      GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY_2: bindings.secret(),
      POSTGRES_PASSWORD: bindings.secret(),
      POSTGRES_PRISMA_URL: bindings.secret(),
      POSTGRES_URL: bindings.secret(),
      POSTGRES_URL_NON_POOLING: bindings.secret(),
      SUPABASE_ANON_KEY: bindings.secret(),
      SUPABASE_JWT_SECRET: bindings.secret(),
      SUPABASE_SECRET_KEY: bindings.secret(),
      SUPABASE_SERVICE_ROLE_KEY: bindings.secret(),
      VK_SERVICE_TOKEN: bindings.secret(),
    },
  }),
});
