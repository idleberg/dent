import { logger } from './log.js';

// silence consola during tests; spies on logger.* still record calls,
// but the reporter (which writes to stdout) is gated by `level`
logger.level = -999;
