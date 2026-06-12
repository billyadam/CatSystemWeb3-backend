const db = require('../database/knex');
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/* ───────── Sequelize Models (used for transaction-based operations) ───────── */

const Request = sequelize.define(
  'Request',
  {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    user_wallet: { type: DataTypes.STRING(50), allowNull: false },
    requested_at: { type: DataTypes.DATE, allowNull: false },
    approved_by: { type: DataTypes.STRING(50), allowNull: true },
    rejected_by: { type: DataTypes.STRING(50), allowNull: true },
    approved_at: { type: DataTypes.DATE, allowNull: true },
    rejected_at: { type: DataTypes.DATE, allowNull: true },
    status: { type: DataTypes.STRING(20), allowNull: false },
  },
  { tableName: 'requests', timestamps: false }
);

const User = sequelize.define(
  'User',
  {
    wallet_address: { type: DataTypes.STRING(50), primaryKey: true },
    name: { type: DataTypes.STRING(100), allowNull: true },
    bio: { type: DataTypes.TEXT, allowNull: true },
    type: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'cat_lover' },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  { tableName: 'users', timestamps: false }
);

/* ───────── Existing Knex-based helpers ───────── */

async function findByWallet(walletAddress) {
  const admin = await db('admins').where({ wallet_address: walletAddress }).first();
  return admin || null;
}

/* ───────── Request helpers (Sequelize) ───────── */

/**
 * Find a request by ID.
 */
async function findRequestById(id) {
  return Request.findByPk(id);
}

/**
 * Reject a breeder request.
 * Updates only the requests table: rejected_by, rejected_at, status = 'rejected'
 */
async function rejectRequest(requestId, adminWallet) {
  const request = await Request.findByPk(requestId);
  if (!request) throw new Error('Request not found');
  if (request.status !== 'pending') throw new Error('Request is not pending');

  request.rejected_by = adminWallet;
  request.rejected_at = new Date();
  request.status = 'rejected';
  await request.save();

  return request;
}

/**
 * Approve a breeder request.
 * Uses a Sequelize Transaction Block to atomically:
 *   1. Update Request  → approved_by, approved_at, status = 'approved'
 *   2. Update User     → type dari 'cat_lover' menjadi 'breeder'
 *
 * Jika salah satu gagal, kedua perubahan di-rollback.
 */
async function approveRequest(requestId, adminWallet) {
  const result = await sequelize.transaction(async (t) => {
    // 1. Update request
    const request = await Request.findByPk(requestId, { transaction: t });
    if (!request) throw new Error('Request not found');
    if (request.status !== 'pending') throw new Error('Request is not pending');

    request.approved_by = adminWallet;
    request.approved_at = new Date();
    request.status = 'approved';
    await request.save({ transaction: t });

    // 2. Update user type: cat_lover → breeder
    const user = await User.findByPk(request.user_wallet, { transaction: t });
    if (!user) throw new Error('User not found');

    user.type = 'breeder';
    await user.save({ transaction: t });

    return { request, user };
  });

  return result;
}

module.exports = {
  findByWallet,
  findRequestById,
  rejectRequest,
  approveRequest,
};
