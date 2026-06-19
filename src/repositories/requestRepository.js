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

module.exports = { findAll, findByStatus };
