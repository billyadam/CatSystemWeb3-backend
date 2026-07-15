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
 * Insert onboarding data for a user.
 * @param {string} walletAddress
 * @param {{ name: string, bio?: string, email: string, phone_number?: string, city: string, country: string, birthdate: string }} data
 * @returns {Promise<object>} the updated user object
 */
async function insertOnboarding(walletAddress, { name, bio, email, phone_number, city, country, birthdate }) {
  const [user] = await db('users')
    .insert({
      wallet_address: walletAddress,
      name,
      bio: bio ?? null,
      email,
      phone_number: phone_number ?? null,
      city,
      country,
      birthdate,
    })
    .returning('*');
  return user;
}

/**
 * Update user bio directly (no approval needed).
 * @param {string} walletAddress
 * @param {string|null} bio
 * @returns {Promise<object>}
 */
async function updateProfileBio(walletAddress, bio) {
  const [user] = await db('users')
    .where({ wallet_address: walletAddress })
    .update({ bio })
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

// ---------------------------------------------------------------------------
// Profile update requests (name, phone_number, email, country, city)
// These changes are not applied directly to the user; they go into
// `request_profile_updates` with status='pending' and require admin approval.
// ---------------------------------------------------------------------------

// Fields that require admin approval before being applied to the user.
const APPROVAL_FIELDS = ['name', 'phone_number', 'email', 'country', 'city'];

/**
 * Find an existing pending profile update request for a wallet.
 * Used to prevent duplicate pending requests.
 * @param {string} userWallet
 * @returns {Promise<object|null>}
 */
async function findActivePendingProfileUpdate(userWallet) {
  const row = await db('request_profile_updates')
    .where({ user_wallet: userWallet, status: 'pending' })
    .first();
  return row || null;
}

/**
 * Create a pending profile update request, storing before/after values.
 * @param {string} userWallet
 * @param {object} oldValues subset of APPROVAL_FIELDS with current values
 * @param {object} newValues subset of APPROVAL_FIELDS with requested values
 * @returns {Promise<object>} the inserted row
 */
async function createProfileUpdateRequest(userWallet, oldValues, newValues) {
  const insertData = {
    user_wallet: userWallet,
    status: 'pending',
    requested_at: new Date(),
  };
  for (const field of APPROVAL_FIELDS) {
    insertData[`${field}_old`] = oldValues[field] ?? null;
    insertData[`${field}_new`] = newValues[field] ?? null;
  }

  const [row] = await db('request_profile_updates').insert(insertData).returning('*');
  return row;
}

module.exports = {
  findByWallet,
  insertOnboarding,
  updateProfileBio,
  updateProfilePicture,
  APPROVAL_FIELDS,
  findActivePendingProfileUpdate,
  createProfileUpdateRequest,
};
