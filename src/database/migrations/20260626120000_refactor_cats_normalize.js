/**
 * @param {import('knex').Knex} knex
 * @returns {Promise<void>}
 *
 * Normalizes the cats table:
 * - Adds date_of_birth column
 * - Removes bio profile columns (moved to bio_profiles table)
 * - Removes image_url_1 / image_url_2 (moved to cat_images table)
 * - Creates bio_profiles table (1:1 FK to cats)
 * - Creates cat_images table (1:many FK to cats)
 */
exports.up = async function (knex) {
  // 1. Alter cats table — add date_of_birth, drop bio + image columns
  await knex.schema.alterTable('cats', (table) => {
    table.bigInteger('date_of_birth').nullable();
  });

  // Drop columns that are moving to bio_profiles / cat_images
  // knex.schema.alterTable doesn't support dropping multiple columns in one call on all DBs,
  // so we chain them.
  const hasCols = await knex.schema.hasColumn('cats', 'breed');
  if (hasCols) {
    await knex.schema.alterTable('cats', (table) => {
      table.dropColumn('breed');
      table.dropColumn('coat_color');
      table.dropColumn('coat_length');
      table.dropColumn('eye_color');
      table.dropColumn('ear_type');
      table.dropColumn('body_size');
      table.dropColumn('description');
      table.dropColumn('image_url_1');
      table.dropColumn('image_url_2');
    });
  }

  // 2. Create bio_profiles table
  await knex.schema.createTable('bio_profiles', (table) => {
    table.increments('id').primary();
    table
      .string('cat_pda', 64)
      .notNullable()
      .unique()
      .references('cat_pda')
      .inTable('cats')
      .onDelete('CASCADE');
    table.string('breed', 32).notNullable().defaultTo('');
    table.string('coat_color', 32).notNullable().defaultTo('');
    table.string('coat_length', 16).notNullable().defaultTo('');
    table.string('eye_color', 32).notNullable().defaultTo('');
    table.string('ear_type', 16).notNullable().defaultTo('');
    table.string('body_size', 16).notNullable().defaultTo('');
    table.string('personality_trait', 32).notNullable().defaultTo('');
    table.string('description', 512).notNullable().defaultTo('');
    table.timestamps(true, true);
  });

  // 3. Create cat_images table
  await knex.schema.createTable('cat_images', (table) => {
    table.increments('id').primary();
    table
      .string('cat_pda', 64)
      .notNullable()
      .references('cat_pda')
      .inTable('cats')
      .onDelete('CASCADE')
      .index();
    table.string('image_pda', 64).notNullable().unique();
    table.smallint('index').notNullable().defaultTo(0);
    table.string('image_url', 256).notNullable();
    table.string('description', 64).notNullable().defaultTo('');
    table.timestamps(true, true);
  });
};

/**
 * @param {import('knex').Knex} knex
 * @returns {Promise<void>}
 */
exports.down = async function (knex) {
  // Drop new tables
  await knex.schema.dropTableIfExists('cat_images');
  await knex.schema.dropTableIfExists('bio_profiles');

  // Restore columns on cats table
  await knex.schema.alterTable('cats', (table) => {
    table.dropColumn('date_of_birth');
    table.string('breed', 32).notNullable().defaultTo('');
    table.string('coat_color', 32).notNullable().defaultTo('');
    table.string('coat_length', 16).notNullable().defaultTo('');
    table.string('eye_color', 32).notNullable().defaultTo('');
    table.string('ear_type', 16).notNullable().defaultTo('');
    table.string('body_size', 16).notNullable().defaultTo('');
    table.string('description', 512).notNullable().defaultTo('');
    table.string('image_url_1', 256).notNullable().defaultTo('');
    table.string('image_url_2', 256).notNullable().defaultTo('');
  });
};
