import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1, // 10% des transactions sont tracées en production
  replaysSessionSampleRate: 0.1, // 10% des sessions sont rejouées pour débogage
  beforeSend(event, hint) {
    // Filtrer les erreurs en développement
    if (process.env.NODE_ENV === 'development') {
      return null;
    }
    return event;
  },
});
