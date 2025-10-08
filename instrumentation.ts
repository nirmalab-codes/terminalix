// Next.js instrumentation hook - runs on server startup
// This auto-starts the background scheduler

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('[Instrumentation] 🔧 Server starting, initializing services...');

    // Start WebSocket broadcaster
    const { broadcaster } = await import('./lib/ws-broadcaster');
    broadcaster.initialize(3002);

    // Start Binance scheduler
    const { startScheduler } = await import('./lib/scheduler/binance-scheduler');
    await startScheduler();

    console.log('[Instrumentation] ✅ All services initialized');
  }
}
