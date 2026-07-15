/**
 * Add onboarding attributes to users table:
 *   - email (required)
 *   - phone_number (optional)
 *   - city (required)
 *   - country (required)
 *   - birthdate (required) — date of birth of the cat owner
 *
 * @param {import('knex').Knex} knex
 */
exports.up = function (knex) {
  return knex.schema.alterTable('users', (table) => {
    table.string('email', 255).nullable();
    table.string('phone_number', 20).nullable();
    table.string('city', 100).nullable();
    table.string('country', 100).nullable();
    table.date('birthdate').nullable();
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = function (knex) {
  return knex.schema.alterTable('users', (table) => {
    table.dropColumn('email');
    table.dropColumn('phone_number');
    table.dropColumn('city');
    table.dropColumn('country');
    table.dropColumn('birthdate');
  });
};
