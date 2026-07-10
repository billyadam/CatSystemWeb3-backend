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

// async function createUser(walletAddress) {
//   const [user] = await db('users')
//     .insert({ wallet_address: walletAddress })
//     .returning('*');
//   return user;
// }

/**
 * Update onboarding data (name, bio, username) for a user.
 * Idempotent: calling multiple times with the same data produces identical state.
 * @param {string} walletAddress
 * @param {{ name: string, bio?: string }} data
 * @returns {Promise<object>} the updated user object
 */
async function insertOnboarding(walletAddress, { name, bio }) {
  const [user] = await db('users')
    .insert({ name, bio, wallet_address: walletAddress })
    .returning('*');
  return user;
}

/**
 * Update user profile details (name, bio).
 * @param {string} walletAddress 
 * @param {{ name: string, bio?: string }} data 
 * @returns {Promise<object>}
 */
async function updateProfile(walletAddress, { name, bio }) {
  const [user] = await db('users')
    .where({ wallet_address: walletAddress })
    .update({ name, bio })
    .returning('*');
  return user;
}

/**
 * Update user profile picture URL.
 * @param {string} walletAddress 
 * @param {string} profilePictureUrl 
 * @returns {Promise<object>}
 */
async function updateProfilePicture(walletAddress, profilePictureUrl) {
  const [user] = await db('users')
    .where({ wallet_address: walletAddress })
    .update({ profile_picture_url: profilePictureUrl })
    .returning('*');
  return user;
}

module.exports = { findByWallet, insertOnboarding, updateProfile, updateProfilePicture };
