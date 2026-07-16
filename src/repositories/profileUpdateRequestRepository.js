const db = require('../database/knex');

// Fields that require admin approval before being applied to the user.
const APPROVAL_FIELDS = ['name', 'phone_number', 'email', 'country', 'city'];

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
 * Find an existing pending profile update request for a wallet.
 * Used to prevent duplicate pending requests.
 * @param {string} userWallet
 * @param {import('knex').Knex|import('knex').Knex.Transaction} [trx]
 * @returns {Promise<object|null>}
 */
async function findActivePendingProfileUpdate(userWallet, trx = db) {
  const row = await trx('request_profile_updates')
    .where({ user_wallet: userWallet, status: 'pending' })
    .first();
  return row || null;
}

/**
 * Create a pending profile update request, storing before/after values.
 * @param {string} userWallet
 * @param {object} oldValues subset of APPROVAL_FIELDS with current values
 * @param {object} newValues subset of APPROVAL_FIELDS with requested values
 * @param {import('knex').Knex|import('knex').Knex.Transaction} [trx]
 * @returns {Promise<object>} the inserted row
 */
async function createProfileUpdateRequest(userWallet, oldValues, newValues, trx = db) {
  const insertData = {
    user_wallet: userWallet,
    status: 'pending',
    requested_at: new Date(),
  };
  for (const field of APPROVAL_FIELDS) {
    insertData[`${field}_old`] = oldValues[field] ?? null;
    insertData[`${field}_new`] = newValues[field] ?? null;
  }

  const [row] = await trx('request_profile_updates').insert(insertData).returning('*');
  return row;
}

module.exports = {
  findAll,
  findById,
  findActivePendingProfileUpdate,
  createProfileUpdateRequest,
};
