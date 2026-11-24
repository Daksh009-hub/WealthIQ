import { app } from './app.js';
import { runMigrations } from './db/migrate.js';
import { startSweeper } from './services/sweeper.js';

const PORT = process.env.PORT || 4000;

async function bootstrap() {
  try {
    await runMigrations();
    startSweeper(2000); // 2-second sweep for expired reservations

    app.listen(PORT, () => {
      console.log(`[bussin-api] Server running at http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('[bussin-api] Startup error:', err);
    process.exit(1);
  }
}

bootstrap();
