const db = require('../database/knex');

async function getAllBreeds() {
  return db('breeds').select('id', 'name', 'description').orderBy('name');
}

module.exports = { getAllBreeds };
