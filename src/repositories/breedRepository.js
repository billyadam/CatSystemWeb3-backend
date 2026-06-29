const db = require('../database/knex');

async function getAllBreeds() {
  return db('cat_breeds').select('id', 'name', 'name_long').orderBy('name');
}

module.exports = { getAllBreeds };
