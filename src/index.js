require('dotenv').config();
const app = require('./app');
const sequelize = require('./config/database');
const { startWithReconnect } = require('./listeners/programListener');

const PORT = process.env.PORT || 3000;

// Load your Anchor IDL here
const idl = require('./idl.json');

(async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connection established.');

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

    startWithReconnect(idl);
  } catch (err) {
    console.error('Startup error:', err);
    process.exit(1);
  }
})();
