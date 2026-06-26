const db = require('../database/knex');

const baseQuery = () =>
  db('requests')
    .leftJoin('users', 'requests.user_wallet', 'users.wallet_address')
    .leftJoin('admins as approver', 'requests.approved_by', 'approver.wallet_address')
    .leftJoin('admins as rejecter', 'requests.rejected_by', 'rejecter.wallet_address')
    .select(
      'requests.*',
      'users.name as user_name',
      'approver.name as approved_by_name',
      'rejecter.name as rejected_by_name'
    )
    .orderBy('requests.requested_at', 'desc');

async function findAll() {
  return await baseQuery();
}

async function findByStatus(status) {
  return await baseQuery().where({ 'requests.status': status });
}

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
 * @param {string|null} documentUrl - Relative URL to the uploaded PDF (e.g. /uploads/request-breeder/...)
 * @returns {Promise<object>} the inserted row
 */
async function createBreederRequest(userWallet, documentUrl = null) {
  const [row] = await db('requests')
    .insert({
      user_wallet: userWallet,
      status: 'pending',
      requested_at: new Date(),
      document_url: documentUrl,
    })
    .returning('*');
  return row;
}

module.exports = { 
  findAll,
  findByStatus,
  findRequestById,
  rejectRequest,
  approveRequest,
  findActiveRequestByWallet, 
  createBreederRequest,
};

