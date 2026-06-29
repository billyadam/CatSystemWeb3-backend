/**
 * @param {import('knex').Knex} knex
 */
exports.up = function (knex) {
  return knex.schema.renameTable('breeds', 'cat_breeds');
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = function (knex) {
  return knex.schema.renameTable('cat_breeds', 'breeds');
};
