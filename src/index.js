require('dotenv').config();
const fs = require('fs');
const path = require('path');
const app = require('./app');
const sequelize = require('./config/database');
const { startWithReconnect, backfillExistingCats } = require('./listeners/programListener');

const PORT = process.env.PORT || 3000;

function loadIdl() {
  const idlPath = path.join(__dirname, 'idl.json');
  if (!fs.existsSync(idlPath)) {
    console.warn('[startup] src/idl.json not found — skipping indexer. See TODO.md for how to fetch it.');
    return null;
  }
  return JSON.parse(fs.readFileSync(idlPath, 'utf8'));
}

(async () => {
  try {
    await sequelize.authenticate();
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
