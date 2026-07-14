/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  await knex.schema.renameTable('requests', 'request_breeders');

  // renameTable hanya mengganti nama tabel; index, sequence, dan
  // constraint tetap memakai nama lama.
  await knex.raw('ALTER INDEX requests_status_index RENAME TO request_breeders_status_index');
  await knex.raw('ALTER SEQUENCE requests_id_seq RENAME TO request_breeders_id_seq');
  await knex.raw('ALTER TABLE request_breeders RENAME CONSTRAINT requests_pkey TO request_breeders_pkey');
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.raw('ALTER TABLE request_breeders RENAME CONSTRAINT request_breeders_pkey TO requests_pkey');
  await knex.raw('ALTER SEQUENCE request_breeders_id_seq RENAME TO requests_id_seq');
  await knex.raw('ALTER INDEX request_breeders_status_index RENAME TO requests_status_index');

  await knex.schema.renameTable('request_breeders', 'requests');
};
