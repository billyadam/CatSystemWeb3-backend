require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const app = require('./app');
const db = require('./database/knex');
const { startWithReconnect, backfillExistingCats } = require('./listeners/programListener');

const PORT = process.env.PORT || 3000;

function loadIdl() {
  const idlPath = path.join(__dirname, 'idl', 'cat_system.json');
  if (!fs.existsSync(idlPath) || !process.env.PROGRAM_ID) {
    console.warn('[startup] src/idl/cat_system.json  or program ID not found — skipping indexer.');
    return null;
  }
  return JSON.parse(fs.readFileSync(idlPath, 'utf8'));
}

(async () => {
  try {
    await db.raw('SELECT 1');
    console.log('[startup] DB connected');
  } catch (err) {
    console.error('[startup] DB connection failed:', err.message);
    process.exit(1);
  }

  const idl = loadIdl();
  if (idl) {
    await backfillExistingCats(idl);
    startWithReconnect(idl);
  }

  app.listen(PORT, '0.0.0.0', () => {

    console.log(`Server running on port ${PORT}`);
  });
})();
