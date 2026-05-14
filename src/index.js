require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || 3000;

// TODO: re-enable DB + Solana listener once auth is verified
// const sequelize = require('./config/database');
// const { startWithReconnect } = require('./listeners/programListener');
// const idl = require('./idl.json');

(async () => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });

  // await sequelize.authenticate();
  // startWithReconnect(idl);
})();
