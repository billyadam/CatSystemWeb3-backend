const Cat = require('../models/Cat');

/**
 * Count the total number of cats owned by a given wallet address.
 * Uses Sequelize COUNT aggregate — does NOT fetch row data.
 *
 * @param {string} ownerWallet - The owner's wallet address from the JWT payload.
 * @returns {Promise<number>} Total count of cats belonging to the owner.
 */
async function countByOwnerWallet(ownerWallet) {
  const result = await Cat.count({
    where: { owner_wallet: ownerWallet },
  });

  return result;
}

module.exports = { countByOwnerWallet };
