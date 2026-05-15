const { randomUUID } = require('crypto');

// In-memory user store: Privy DID -> user object
// Privy sub is always present regardless of login method (Google, wallet, etc.)
const users = new Map();

function findOrCreate({ privyId, wallet }) {
  if (users.has(privyId)) {
    const user = users.get(privyId);
    // Attach wallet if user later links one
    if (wallet && !user.wallet) user.wallet = wallet;
    return user;
  }

  const user = {
    id: randomUUID(),
    privyId,
    wallet: wallet || null,
    createdAt: new Date().toISOString(),
  };

  users.set(privyId, user);
  return user;
}

module.exports = { findOrCreate };
