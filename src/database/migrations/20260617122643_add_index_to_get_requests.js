/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.alterTable('requests', (table) => {
        table.index(['status'], 'requests_status_index');
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
    return knex.schema.alterTable('requests', (table) => {
        table.dropIndex(['status'], 'requests_status_index');
    });
};
