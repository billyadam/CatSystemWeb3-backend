require('dotenv').config();
const app = require('./app');
const db = require('./database/knex');
const PORT = process.env.PORT || 3000;

// TODO: re-enable Solana listener once idl.json is available
// const sequelize = require('./config/database');
// const { startWithReconnect } = require('./listeners/programListener');
// const idl = require('./idl.json');

(async () => {

  try {
    await db.raw('SELECT 1');
    console.log('Database connection established.');
  } catch (err) {
    console.error('Database connection failed:', err.message);
    process.exit(1);
  }


  app.listen(PORT, '0.0.0.0', () => {

    console.log(`Server running on port ${PORT}`);
  });

  // await sequelize.authenticate();
  // startWithReconnect(idl);
})();
