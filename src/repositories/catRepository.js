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

module.exports = { countByOwnerWallet };
