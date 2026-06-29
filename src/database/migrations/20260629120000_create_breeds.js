/**
 * @param {import('knex').Knex} knex
 */
exports.up = function (knex) {
  return knex.schema.createTable('breeds', (table) => {
    table.increments('id').primary();
    table.string('name', 64).notNullable().unique();
    table.string('description', 512).notNullable().defaultTo('');
    table.timestamps(true, true);
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('breeds');
};
