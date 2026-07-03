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
  // Base on bio_profiles, join cats for the header/owner fields the route needs
  // (owner_wallet, name, gender, block_time live on the cats table). The full
  // bio_profiles row — including every new column — is fetched below via *.
  const cat = await db('bio_profiles')
    .join('cats', 'cats.cat_pda', 'bio_profiles.cat_pda')
    .where('bio_profiles.cat_pda', catPda)
    .first(
      'cats.cat_pda',
      'cats.owner_wallet',
      'cats.name',
      'cats.gender',
      'cats.block_time'
    );

  if (!cat) return null;

  // Pull every column from bio_profiles as its own row so we don't collide
  // with the cats columns (cat_pda, id, timestamps) on a join.
  const bioProfile = await db('bio_profiles')
    .where({ cat_pda: catPda })
    .first('*');

  const primaryImage = await db('cat_images')
    .where({ cat_pda: catPda })
    .orderBy('index', 'asc')
    .first('image_url');

  cat.bio_profile = bioProfile || null;
  cat.image_url = primaryImage ? primaryImage.image_url : null;
  return cat;
}

module.exports = { countByOwnerWallet, findByOwnerWallet, findByPda };
