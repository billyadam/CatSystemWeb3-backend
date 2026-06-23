const db = require('../database/knex');

/**
 * Find a request by ID.
*/
async function findRequestById(id) {
    const request = await db('requests').where({ id }).first();
    return request || null;
}

/**
 * Reject a breeder request.
 * Updates only the requests table: rejected_by, rejected_at, status = 'rejected'
 */
async function rejectRequest(requestId, adminWallet) {
  const updated = await db.transaction(async (trx) => {
    const request = await trx('requests').where({ id: requestId }).forUpdate().first();
    if (!request) throw new Error('Request not found');
    if (request.status !== 'pending') throw new Error('Request is not pending');

    const [result] = await trx('requests')
      .where({ id: requestId })
      .update({
        rejected_by: adminWallet,
        rejected_at: new Date(),
        status: 'rejected',
      })
      .returning('*');

    return result;
  });

  return updated;
}

/**
 * Approve a breeder request.
 * Uses a Knex transaction to atomically:
 *   1. Update Request  → approved_by, approved_at, status = 'approved'
 *   2. Update User     → type dari 'cat_lover' menjadi 'breeder'
 *
 * Jika salah satu gagal, kedua perubahan di-rollback.
 */
async function approveRequest(requestId, adminWallet) {
  const result = await db.transaction(async (trx) => {
    // 1. Update request
    const request = await trx('requests').where({ id: requestId }).forUpdate().first();
    if (!request) throw new Error('Request not found');
    if (request.status !== 'pending') throw new Error('Request is not pending');

    const [updatedRequest] = await trx('requests')
      .where({ id: requestId })
      .update({
        approved_by: adminWallet,
        approved_at: new Date(),
        status: 'approved',
      })
      .returning('*');

    // 2. Update user type: cat_lover → breeder
    const user = await trx('users')
      .where({ wallet_address: request.user_wallet })
      .forUpdate().first();
    if (!user) throw new Error('User not found');

    const [updatedUser] = await trx('users')
      .where({ wallet_address: request.user_wallet })
      .update({ type: 'breeder' })
      .returning('*');

    return { request: updatedRequest, user: updatedUser };
  });

  return result;
}

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

module.exports = { 
  findRequestById,
  rejectRequest,
  approveRequest,
  findActiveRequestByWallet, 
  createBreederRequest,
};

