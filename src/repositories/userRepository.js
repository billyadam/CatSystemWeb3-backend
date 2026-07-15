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
 * Base query for listing profile update requests with joined display names.
 */
const profileUpdateBaseQuery = () =>
  db('request_profile_updates')
    .leftJoin('users', 'request_profile_updates.user_wallet', 'users.wallet_address')
    .leftJoin('admins as approver', 'request_profile_updates.approved_by', 'approver.wallet_address')
    .leftJoin('admins as rejecter', 'request_profile_updates.rejected_by', 'rejecter.wallet_address')
    .select(
      'request_profile_updates.*',
      'users.name as user_name',
      'approver.name as approved_by_name',
      'rejecter.name as rejected_by_name'
    )
    .orderBy('request_profile_updates.requested_at', 'desc');

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

/**
 * List all profile update requests (with joined display names).
 */
async function findAllProfileUpdates() {
  return profileUpdateBaseQuery();
}

/**
 * List profile update requests filtered by status.
 */
async function findProfileUpdatesByStatus(status) {
  return profileUpdateBaseQuery().where({ 'request_profile_updates.status': status });
}

/**
 * Find a single profile update request by id.
 */
async function findProfileUpdateById(id) {
  const row = await db('request_profile_updates').where({ id }).first();
  return row || null;
}

/**
 * Approve a profile update request.
 * Transaction:
 *   1. Lock + validate the request is pending.
 *   2. Mark request approved (approved_by, approved_at).
 *   3. Apply every non-null `*_new` field to the user.
 * @param {string|number} requestId
 * @param {string} adminWallet
 * @returns {Promise<{request: object, user: object}>}
 */
async function approveProfileUpdate(requestId, adminWallet) {
  return db.transaction(async (trx) => {
    const request = await trx('request_profile_updates')
      .where({ id: requestId })
      .forUpdate()
      .first();
    if (!request) throw new Error('Request not found');
    if (request.status !== 'pending') throw new Error('Request is not pending');

    const [updatedRequest] = await trx('request_profile_updates')
      .where({ id: requestId })
      .update({
        status: 'approved',
        approved_by: adminWallet,
        approved_at: new Date(),
      })
      .returning('*');

    const user = await trx('users')
      .where({ wallet_address: request.user_wallet })
      .forUpdate()
      .first();
    if (!user) throw new Error('User not found');

    // Apply only the fields that were part of the request (non-null *_new).
    const userUpdate = {};
    for (const field of APPROVAL_FIELDS) {
      const newValue = request[`${field}_new`];
      if (newValue !== null && newValue !== undefined) {
        userUpdate[field] = newValue;
      }
    }

    let updatedUser = user;
    if (Object.keys(userUpdate).length > 0) {
      [updatedUser] = await trx('users')
        .where({ wallet_address: request.user_wallet })
        .update(userUpdate)
        .returning('*');
    }

    return { request: updatedRequest, user: updatedUser };
  });
}

/**
 * Reject a profile update request. Does not touch the user.
 * @param {string|number} requestId
 * @param {string} adminWallet
 * @returns {Promise<object>} the updated request row
 */
async function rejectProfileUpdate(requestId, adminWallet) {
  return db.transaction(async (trx) => {
    const request = await trx('request_profile_updates')
      .where({ id: requestId })
      .forUpdate()
      .first();
    if (!request) throw new Error('Request not found');
    if (request.status !== 'pending') throw new Error('Request is not pending');

    const [updated] = await trx('request_profile_updates')
      .where({ id: requestId })
      .update({
        status: 'rejected',
        rejected_by: adminWallet,
        rejected_at: new Date(),
      })
      .returning('*');

    return updated;
  });
}

module.exports = {
  findByWallet,
  insertOnboarding,
  updateProfileBio,
  updateProfilePicture,
  APPROVAL_FIELDS,
  findActivePendingProfileUpdate,
  createProfileUpdateRequest,
  findAllProfileUpdates,
  findProfileUpdatesByStatus,
  findProfileUpdateById,
  approveProfileUpdate,
  rejectProfileUpdate,
};
