/**
 * @param {import('knex').Knex} knex
 */
exports.up = function (knex) {
  return knex.schema.createTable('requests', (table) => {
    table.bigIncrements('id').primary();
    table.string('user_wallet', 50).notNullable();
    table.datetime('requested_at').notNullable();
    table.string('approved_by', 50).nullable();
    table.string('rejected_by', 50).nullable();
    table.datetime('approved_at').nullable();
    table.datetime('rejected_at').nullable();
    table.string('status', 20).notNullable();
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('requests');
};
