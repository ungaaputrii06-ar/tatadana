export async function register() {
  const isBuilding =
    process.env.NEXT_PHASE === 'phase-production-build' ||
    process.env.npm_lifecycle_event === 'build' ||
    process.argv.some((arg) => arg.includes('build')) ||
    process.env.NEXT_PHASE === undefined;

  if (
    process.env.NEXT_RUNTIME === 'nodejs' &&
    !isBuilding &&
    process.env.NODE_ENV !== 'test'
  ) {
    const { telegramLongPoller } = await import('@/lib/telegram/long-poller');
    console.log('[Instrumentation] Initializing Telegram Long Poller on server startup...');
    telegramLongPoller.start().then((res) => {
      if (res.ok) {
        console.log(`[Instrumentation] Telegram Long Poller started successfully for "${res.bot?.first_name}" (@${res.bot?.username})`);
      } else {
        console.log(`[Instrumentation] Telegram Long Poller idle: ${res.message}`);
      }
    }).catch((err) => {
      console.warn('[Instrumentation] Long poller startup notice:', err.message);
    });
  }
}
