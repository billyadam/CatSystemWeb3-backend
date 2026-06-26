/**
 * @param {import('knex').Knex} knex
 */
exports.up = function (knex) {
  return knex.schema.alterTable('requests', (table) => {
    table.string('document_url', 500).nullable();
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = function (knex) {
  return knex.schema.alterTable('requests', (table) => {
    table.dropColumn('document_url');
  });
};
