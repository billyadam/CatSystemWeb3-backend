const jwksClient = require('jwks-rsa');
const jwt = require('jsonwebtoken');
const { PrivyClient } = require('@privy-io/server-auth');

const client = jwksClient({
  jwksUri: `https://auth.privy.io/api/v1/apps/${process.env.PRIVY_APP_ID}/jwks.json`,
  cache: true,
  cacheMaxAge: 10 * 60 * 1000,
  rateLimit: true,
});

function getSigningKey(header, callback) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) return callback(err);
    callback(null, key.getPublicKey());
  });
}

// Verifies the Privy JWT: signature (via JWKS), issuer, audience, and expiry.
async function verifyPrivyToken(token) {
  return new Promise((resolve, reject) => {
    jwt.verify(
      token,
      getSigningKey,
      {
        issuer: process.env.PRIVY_ISSUER,
        audience: process.env.PRIVY_APP_ID,
      },
      (err, decoded) => {
        if (err) return reject(err);
        resolve(decoded);
      }
    );
  });
}


// Fetches the full Privy user and returns the Solana wallet address.
// External wallets (e.g. Phantom) are not in the JWT — they require an API call.
// Add multiple wallet check attempts to handle delay from privy's backend
async function getWalletAddress(privyUserId) {
  const privy = new PrivyClient(process.env.PRIVY_APP_ID, process.env.PRIVY_APP_SECRET);

  // Poll every 3s for up to 60s total.
  // Privy's wallet indexing delay is unpredictable (can be 10-60s on devnet),
  // so a steady fixed interval is better than exponential backoff, which
  // wastes time on big gaps and exhausts its budget before the wallet appears.
  const MAX_ATTEMPTS = 20;
  const POLL_INTERVAL_MS = 3000; // 3s × 20 = 60s total window

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let user;
    try {
      user = await privy.getUser(privyUserId);
    } catch (err) {
      throw new Error(`Failed to fetch Privy user: ${err.message}`);
    }

    const wallet = (user.linkedAccounts || []).find(
      (a) => a.type === 'wallet' && a.chainType === 'solana'
    );

    if (wallet?.address) {
      if (attempt > 1) {
        console.log(`[privy] Solana wallet found on attempt ${attempt} (~${(attempt - 1) * 3}s elapsed) for ${privyUserId}`);
      }
      return wallet.address;
    }

    if (attempt < MAX_ATTEMPTS) {
      console.warn(`[privy] No Solana wallet yet for ${privyUserId} (attempt ${attempt}/${MAX_ATTEMPTS}), retrying in ${POLL_INTERVAL_MS}ms...`);
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    }
  }

  throw new Error(`No Solana wallet linked to Privy user ${privyUserId} after ${MAX_ATTEMPTS} attempts (~60s)`);
}

module.exports = { verifyPrivyToken, getWalletAddress };
