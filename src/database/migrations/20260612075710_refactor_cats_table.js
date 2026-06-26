/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
    await knex.schema.dropTableIfExists('cats');
    await knex.schema.createTable('cats', (table) => {
        table.string('cat_pda', 64).primary();
        table.string('owner_wallet', 64).notNullable().index();
        table.bigInteger('cat_index').notNullable();
        table.string('name', 32).notNullable();
        table.string('gender', 16).notNullable();
        table.string('breed', 32).notNullable();
        table.string('coat_color', 32).notNullable();
        table.string('coat_length', 16).notNullable();
        table.string('eye_color', 32).notNullable();
        table.string('ear_type', 16).notNullable();
        table.string('body_size', 16).notNullable();
        table.string('description', 512).notNullable().defaultTo('');
        table.string('image_url_1', 256).notNullable();
        table.string('image_url_2', 256).notNullable();
        table.string('tx_signature', 128).nullable();
        table.bigInteger('block_time').nullable();
        table.timestamps(true, true);
    });
};
