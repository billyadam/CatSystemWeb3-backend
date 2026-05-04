const { randomUUID } = require('crypto');

// In-memory user store: wallet address -> user object
const users = new Map();

function findOrCreateByWallet(walletAddress) {
  if (users.has(walletAddress)) {
    return users.get(walletAddress);
  }

  const user = {
    id: randomUUID(),
    wallet: walletAddress,
    createdAt: new Date().toISOString(),
  };

  users.set(walletAddress, user);
  return user;
}

module.exports = { findOrCreateByWallet };
