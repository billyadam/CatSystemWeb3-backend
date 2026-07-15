/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 *
 */

exports.up = function (knex) {
  return knex.schema.createTable('request_profile_updates', (table) => {
    table.bigIncrements('id').primary();
    table.string('user_wallet', 50).notNullable();
    table.datetime('requested_at').notNullable();
    table.string('status', 20).notNullable().defaultTo('pending');
    table.string('approved_by', 50).nullable();
    table.string('rejected_by', 50).nullable();
    table.datetime('approved_at').nullable();
    table.datetime('rejected_at').nullable();

    // sebelum
    table.string('name_old', 100).nullable();
    table.string('phone_number_old', 20).nullable();
    table.string('email_old', 255).nullable();
    table.string('country_old', 100).nullable();
    table.string('city_old', 100).nullable();

    // setelah
    table.string('name_new', 100).nullable();
    table.string('phone_number_new', 20).nullable();
    table.string('email_new', 255).nullable();
    table.string('country_new', 100).nullable();
    table.string('city_new', 100).nullable();

    table.index(['status'], 'request_profile_updates_status_index');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('request_profile_updates');
};
