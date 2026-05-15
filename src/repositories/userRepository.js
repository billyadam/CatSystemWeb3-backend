const db = require('../database/knex');

/**
 * Find a user by their wallet address.
 * @param {string} walletAddress
 * @returns {Promise<object|null>} user object or null if not found
 */
async function findByWallet(walletAddress) {
  const user = await db('users').where({ wallet_address: walletAddress }).first();
  return user || null;
}

/**
 * Create a new user with the given wallet address.
 * @param {string} walletAddress
 * @returns {Promise<object>} the newly created user object
 */
async function createUser(walletAddress) {
  const [user] = await db('users')
    .insert({ wallet_address: walletAddress })
    .returning('*');
  return user;
}

/**
 * Update onboarding data (name, bio, username) for a user.
 * Idempotent: calling multiple times with the same data produces identical state.
 * @param {string} walletAddress
 * @param {{ name: string, bio?: string, username: string }} data
 * @returns {Promise<object>} the updated user object
 */
async function updateOnboarding(walletAddress, { name, bio, username }) {
  const [user] = await db('users')
    .where({ wallet_address: walletAddress })
    .update({ name, bio, username })
    .returning('*');
  return user;
}

module.exports = { findByWallet, createUser, updateOnboarding };
