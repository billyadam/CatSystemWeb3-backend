const db = require('../database/knex');

/**
 * Base query with user and admin joins.
 * Returns all columns from request_profile_updates plus user name and admin names.
 */
const baseGetListQuery = () =>
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
 * Find all profile update requests with optional status filter and pagination.
 * @param {object} options
 * @param {string|undefined} options.status  - Filter by status ('pending'|'approved'|'rejected')
 * @param {number} options.page              - 1-indexed page number (default 1)
 * @param {number} options.limit             - Rows per page (default 10)
 * @returns {Promise<{ data: object[], meta: { total: number, page: number, limit: number, totalPages: number } }>}
 */
async function findAll({ status, page = 1, limit = 10 } = {}) {
  const offset = (page - 1) * limit;

  const countQuery = db('request_profile_updates');
  if (status) countQuery.where({ status });
  const [{ count }] = await countQuery.count('id as count');
  const total = Number(count);

  const query = baseGetListQuery();
  if (status) query.where({ 'request_profile_updates.status': status });
  const data = await query.limit(limit).offset(offset);

  return {
    data,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Find a single profile update request by ID.
 * @param {number|string} id
 * @returns {Promise<object|null>}
 */
async function findById(id) {
  const row = await baseGetListQuery()
    .where({ 'request_profile_updates.id': id })
    .first();
  return row || null;
}

/**
 * Approve a profile update request and apply the new profile fields to the user.
 * Runs inside a transaction to ensure atomicity.
 * @param {number|string} id           - request_profile_updates.id
 * @param {string} adminWallet         - wallet address of the approving admin
 * @returns {Promise<object>}          - the updated request row
 */
async function approveProfileUpdateRequest(id, adminWallet) {
  return db.transaction(async (trx) => {
    // 1. Lock and fetch the request
    const request = await trx('request_profile_updates')
      .where({ id })
      .first();

    if (!request) {
      const err = new Error('Profile update request not found');
      err.statusCode = 404;
      throw err;
    }

    if (request.status !== 'pending') {
      const err = new Error(`Request is already ${request.status}`);
      err.statusCode = 409;
      throw err;
    }

    // 2. Mark the request as approved
    const [updated] = await trx('request_profile_updates')
      .where({ id })
      .update({
        status: 'approved',
        approved_by: adminWallet,
        approved_at: new Date(),
      })
      .returning('*');

    // 3. Apply the new profile fields to the user
    const profilePatch = {};
    if (request.name_new        !== null) profilePatch.name         = request.name_new;
    if (request.email_new       !== null) profilePatch.email        = request.email_new;
    if (request.phone_number_new !== null) profilePatch.phone_number = request.phone_number_new;
    if (request.city_new        !== null) profilePatch.city         = request.city_new;
    if (request.country_new     !== null) profilePatch.country      = request.country_new;

    if (Object.keys(profilePatch).length > 0) {
      await trx('users')
        .where({ wallet_address: request.user_wallet })
        .update(profilePatch);
    }

    return updated;
  });
}

/**
 * Reject a profile update request. The user's profile is NOT modified.
 * Runs inside a transaction for consistency.
 * @param {number|string} id           - request_profile_updates.id
 * @param {string} adminWallet         - wallet address of the rejecting admin
 * @returns {Promise<object>}          - the updated request row
 */
async function rejectProfileUpdateRequest(id, adminWallet) {
  return db.transaction(async (trx) => {
    // 1. Lock and fetch the request
    const request = await trx('request_profile_updates')
      .where({ id })
      .first();

    if (!request) {
      const err = new Error('Profile update request not found');
      err.statusCode = 404;
      throw err;
    }

    if (request.status !== 'pending') {
      const err = new Error(`Request is already ${request.status}`);
      err.statusCode = 409;
      throw err;
    }

    // 2. Mark the request as rejected (profile stays unchanged)
    const [updated] = await trx('request_profile_updates')
      .where({ id })
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
  findAll,
  findById,
  approveProfileUpdateRequest,
  rejectProfileUpdateRequest,
};
