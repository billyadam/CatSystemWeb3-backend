const db = require('../database/knex');

async function findByWallet(walletAddress) {
  const admin = await db('admins').where({ wallet_address: walletAddress }).first();
  return admin || null;
}

module.exports = {
  findByWallet,
};
