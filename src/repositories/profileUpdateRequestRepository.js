const db = require('../database/knex');

/**
 * Base query with user and admin joins.
 * Returns all columns from request_profile_updates plus user name and admin names.
 */
const baseQuery = () =>
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

  const query = baseQuery();
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
  const row = await baseQuery()
    .where({ 'request_profile_updates.id': id })
    .first();
  return row || null;
}

module.exports = {
  findAll,
  findById,
};
