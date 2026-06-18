const db = require('../database/knex');

/**
 * Find an existing pending or approved breeder request for a given wallet.
 * Used to prevent duplicate requests.
 * @param {string} userWallet
 * @returns {Promise<object|null>}
 */
async function findActiveRequestByWallet(userWallet) {
  return db('requests')
    .where({ user_wallet: userWallet })
    .whereIn('status', ['pending', 'approved'])
    .first();
}

/**
 * Create a new breeder upgrade request for the given wallet.
 * @param {string} userWallet
 * @returns {Promise<object>} the inserted row
 */
async function createBreederRequest(userWallet) {
  const [row] = await db('requests')
    .insert({ user_wallet: userWallet, status: 'pending', requested_at: new Date() })
    .returning('*');
  return row;
}

module.exports = { findActiveRequestByWallet, createBreederRequest };

