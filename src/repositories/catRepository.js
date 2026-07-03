const db = require('../database/knex');

/**
 * Count the total number of cats owned by a given wallet address.
 *
 * @param {string} ownerWallet - The owner's wallet address from the JWT payload.
 * @returns {Promise<number>} Total count of cats belonging to the owner.
 */
async function countByOwnerWallet(ownerWallet) {
  const result = await db('cats')
    .where({ owner_wallet: ownerWallet })
    .count('* as count')
    .first();

  return parseInt(result.count, 10);
}

/**
 * List cats owned by a wallet — only the fields the cat-list card renders.
 *
 * @param {string} ownerWallet - The owner's wallet address from the JWT payload.
 * @returns {Promise<Array<{cat_pda: string, name: string, gender: string, breed: string, image_url: string|null, block_time: string|null}>>}
 */
async function findByOwnerWallet(ownerWallet) {
  return db('cats')
    .leftJoin('bio_profiles', 'cats.cat_pda', 'bio_profiles.cat_pda')
    .leftJoin('cat_images', function joinPrimaryImage() {
      this.on('cat_images.cat_pda', '=', 'cats.cat_pda').andOn(
        'cat_images.index',
        '=',
        db.raw('0')
      );
    })
    .where('cats.owner_wallet', ownerWallet) // tambahin index
    .orderBy('cats.cat_index', 'asc')
    .select(
      'cats.cat_pda',
      'cats.name',
      'cats.gender',
      'cats.block_time',
      'bio_profiles.breed',
      'cat_images.image_url'
    );
}

/**
 * Fetch a single cat for the individual cat page: header (name/gender/photo),
 * owner, and the complete bio_profiles row (every column).
 *
 * @param {string} catPda - The cat's on-chain PDA (primary key).
 * @returns {Promise<object|null>} Cat row plus `image_url` and `bio_profile`
 *   (the full bio_profiles row, or null if the cat has none); null if the cat
 *   itself is not found.
 */
async function findByPda(catPda) {
  const row = await db('cats')
    .join('bio_profiles', 'cats.cat_pda', 'bio_profiles.cat_pda')
    .leftJoin('cat_images', function joinPrimaryImage() {
      this.on('cat_images.cat_pda', '=', 'cats.cat_pda').andOn(
        'cat_images.index',
        '=',
        db.raw('0')
      );
    })
    .where('cats.cat_pda', catPda)
    .select(
      'cats.cat_pda',
      'cats.owner_wallet',
      'cats.name',
      'cats.gender',
      'cats.block_time',
      'cat_images.image_url',
      db.raw('row_to_json(bio_profiles.*) as bio_profile')
    )
    .first();

  return row ?? null;
}

module.exports = { countByOwnerWallet, findByOwnerWallet, findByPda };
