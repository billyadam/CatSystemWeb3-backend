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
    .where('cats.owner_wallet', ownerWallet)
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
 * Fetch a single cat with the fields the individual cat page renders:
 * header (name/gender/photo), DNA profile, bio (about/personality/color) and owner.
 *
 * @param {string} catPda - The cat's on-chain PDA (primary key).
 * @returns {Promise<object|null>} Flat row joined with bio_profiles, plus image_url; null if not found.
 */
async function findByPda(catPda) {
  const cat = await db('cats')
    .leftJoin('bio_profiles', 'cats.cat_pda', 'bio_profiles.cat_pda')
    .where('cats.cat_pda', catPda)
    .first(
      'cats.cat_pda',
      'cats.owner_wallet',
      'cats.name',
      'cats.gender',
      'cats.block_time',
      'bio_profiles.breed',
      'bio_profiles.coat_color',
      'bio_profiles.coat_length',
      'bio_profiles.eye_color',
      'bio_profiles.ear_type',
      'bio_profiles.body_size',
      'bio_profiles.personality_trait',
      'bio_profiles.description'
    );

  if (!cat) return null;

  const primaryImage = await db('cat_images')
    .where({ cat_pda: catPda })
    .orderBy('index', 'asc')
    .first('image_url');

  cat.image_url = primaryImage ? primaryImage.image_url : null;
  return cat;
}

module.exports = { countByOwnerWallet, findByOwnerWallet, findByPda };
