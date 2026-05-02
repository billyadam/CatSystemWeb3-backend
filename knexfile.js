require('dotenv').config();

/** @type {import('knex').Knex.Config} */
const base = {
  client: 'pg',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
  },
  migrations: {
    directory: './src/database/migrations',
    tableName: 'knex_migrations',
  },
};

module.exports = {
  development: base,
  production: {
    ...base,
    connection: {
      ...base.connection,
      ssl: { rejectUnauthorized: false },
    },
  },
};
