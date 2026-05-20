import { config } from './config';
import logger from './lib/logger';
import app from './app';
import { initAutoBackup } from './lib/autoBackup';
import { initTelegramPolling } from './lib/telegram';
import { initReminderJob } from './lib/reminderJob';

app.listen(config.PORT, () => {
  logger.info(`Server running on port ${config.PORT} [${config.NODE_ENV}]`);
  void initAutoBackup();
  initTelegramPolling();
  initReminderJob();
});
