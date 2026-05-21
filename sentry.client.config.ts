// Sentry client config migrated to instrumentation-client.ts
// This file is kept for backward compatibility but init now lives in instrumentation-client.ts
// per Next.js / Sentry SDK modern recommendations (Turbopack-compatible).
// NOTE: Do NOT call Sentry.init() here — it would duplicate the init in instrumentation-client.ts.
export {};
