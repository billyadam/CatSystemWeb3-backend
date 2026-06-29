const db = require('../database/knex');

async function getAllBreeds() {
  return db('breeds').select('id', 'name', 'name_long').orderBy('name');
}

module.exports = { getAllBreeds };
